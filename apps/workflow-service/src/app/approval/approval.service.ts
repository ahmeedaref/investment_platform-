import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@investment-platform/database";
import { FlowableService } from "../flowable.service";
import { ApprovalDecisionDto } from "./dto/approval-decision.dto";

const APPROVAL_GROUPS = [
  "approval-group-1",
  "approval-group-2",
  "approval-group-3",
  "approval-group-4",
  "approval-group-5",
];

interface AuthenticatedUser {
  sub: string;
  groups?: string[];
}

interface FlowableTask {
  id: string;
  name: string;
  assignee?: string | null;
  processInstanceId: string;
  taskDefinitionKey: string;
  createTime?: string;
}
interface FlowableIdentityLink {
  group?: string | null;
  groupId?: string | null;
  userId?: string | null;
  type: string;
}

interface FlowableProcessInstance {
  id: string;
  businessKey?: string;
}

interface FlowableCollection<T> {
  data?: T[];
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flowable: FlowableService,
  ) { }

  private getUserGroups(user: AuthenticatedUser): string[] {
    if (!Array.isArray(user.groups)) {
      return [];
    }

    return user.groups
      .map((group) => group.replace(/^\/+/, ""))
      .filter((group) => APPROVAL_GROUPS.includes(group));
  }
  private async getTask(taskId: string): Promise<FlowableTask> {
    const task = await this.flowable.request<FlowableTask>(
      `/runtime/tasks/${encodeURIComponent(taskId)}`,
    );

    if (!task || task.taskDefinitionKey !== "parallelApprovals") {
      throw new BadRequestException(
        "This task is not an investment approval task",
      );
    }

    return task;
  }

  private async getTaskApprovalGroup(
    taskId: string,
    user: AuthenticatedUser,
  ): Promise<string> {
    const userGroups = this.getUserGroups(user);

    if (userGroups.length === 0) {
      throw new ForbiddenException(
        "Your account does not belong to an approval group",
      );
    }

    const links = await this.flowable.request<FlowableIdentityLink[]>(
      `/runtime/tasks/${encodeURIComponent(taskId)}/identitylinks`,
    );

    const candidateGroups = links
      .filter((link) => link.type === "candidate")
      .map((link) =>
        (link.group ?? link.groupId)?.replace(/^\/+/, ""),
      )
      .filter((group): group is string => Boolean(group));

    const matchingGroup = candidateGroups.find((group) =>
      userGroups.includes(group),
    );

    if (!matchingGroup) {
      throw new ForbiddenException(
        "You are not authorized to act on this approval task",
      );
    }

    return matchingGroup;
  }

  async getMyTasks(user: AuthenticatedUser) {
    const groups = this.getUserGroups(user);

    if (groups.length === 0) {
      return [];
    }

    const groupQuery = new URLSearchParams({
      candidateGroups: groups.join(","),
      active: "true",
      size: "100",
    });

    const assignedQuery = new URLSearchParams({
      assignee: user.sub,
      active: "true",
      size: "100",
    });

    const [groupResult, assignedResult] = await Promise.all([
      this.flowable.request<FlowableCollection<FlowableTask>>(
        `/runtime/tasks?${groupQuery.toString()}`,
      ),
      this.flowable.request<FlowableCollection<FlowableTask>>(
        `/runtime/tasks?${assignedQuery.toString()}`,
      ),
    ]);

    const tasks = new Map<string, FlowableTask>();

    for (const task of [
      ...(groupResult.data ?? []),
      ...(assignedResult.data ?? []),
    ]) {
      if (task.taskDefinitionKey === "parallelApprovals") {
        tasks.set(task.id, task);
      }
    }

    const results = await Promise.all(
      [...tasks.values()].map(async (task) => {
        try {
          const approvalGroup = await this.getTaskApprovalGroup(
            task.id,
            user,
          );

          return {
            id: task.id,
            name: task.name,
            assignee: task.assignee ?? null,
            approvalGroup,
            processInstanceId: task.processInstanceId,
            createTime: task.createTime,
          };
        } catch {
          return null;
        }
      }),
    );

    return results.filter((task) => task !== null);
  }

  async claimTask(taskId: string, user: AuthenticatedUser) {
    const task = await this.getTask(taskId);

    await this.getTaskApprovalGroup(taskId, user);

    if (task.assignee === user.sub) {
      return {
        taskId,
        assignee: user.sub,
        message: "Task is already claimed by you",
      };
    }

    if (task.assignee) {
      throw new ConflictException(
        "This task has already been claimed by another user",
      );
    }

    await this.flowable.request(
      `/runtime/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "POST",
        body: JSON.stringify({
          action: "claim",
          assignee: user.sub,
        }),
      },
    );

    return {
      taskId,
      assignee: user.sub,
      message: "Task claimed successfully",
    };
  }

  async submitDecision(
    taskId: string,
    dto: ApprovalDecisionDto,
    user: AuthenticatedUser,
  ) {
    const task = await this.flowable.request<{
      id: string;
      processInstanceId: string;
      assignee?: string;
    }>(`/runtime/tasks/${encodeURIComponent(taskId)}`);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignee !== user.sub) {
      throw new ForbiddenException(
        'You must claim this task before submitting a decision',
      );
    }

    const processVariables = await this.flowable.request<
      | Array<{ name: string; value: unknown }>
      | { data?: Array<{ name: string; value: unknown }> }
    >(
      `/runtime/process-instances/${encodeURIComponent(task.processInstanceId)}/variables`,
    );
    const variables = Array.isArray(processVariables)
      ? processVariables
      : processVariables?.data ?? [];

    const investmentId = String(
      variables.find(
        (variable) => variable.name === 'investmentId',
      )?.value ?? '',
    );

    if (!investmentId) {
      throw new BadRequestException(
        'Investment ID not found in process variables',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Serialize decisions for this investment.
        await tx.$queryRaw`
        WITH lock_acquired AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(
            hashtextextended(${investmentId}, 0)
          )
        )
        SELECT 1::int AS locked
        FROM lock_acquired
      `;

        const investment = await tx.investment.findUnique({
          where: { id: investmentId },
        });

        if (!investment) {
          throw new NotFoundException('Investment not found');
        }

        const approvalGroup = await this.getTaskApprovalGroup(
          taskId,
          user,
        );

        const existingVote = await tx.approvalVote.findFirst({
          where: {
            investmentId,
            approvalGroup,
          },
        });

        if (existingVote) {
          throw new ConflictException(
            'This approval group has already submitted a decision',
          );
        }

        await tx.approvalVote.create({
          data: {
            investmentId,
            approvalGroup,
            decision: dto.decision,
            decidedByKeycloakId: user.sub,
            processTaskId: taskId,
            comment: dto.comment,
          },
        });

        const votes = await tx.approvalVote.findMany({
          where: { investmentId },
        });

        const approvedCount = votes.filter(
          (vote) => vote.decision === 'APPROVED',
        ).length;

        const rejectedCount = votes.filter(
          (vote) => vote.decision === 'REJECTED',
        ).length;

        const approvalCompleted =
          rejectedCount > 0 || approvedCount >= 3;

        const outcome =
          rejectedCount > 0
            ? 'REJECTED'
            : approvedCount >= 3
              ? 'APPROVED'
              : 'PENDING';

        if (approvalCompleted) {
          await tx.investment.update({
            where: { id: investmentId },
            data: {
              status: outcome,
            },
          });
        }

        await this.flowable.request(
          `/runtime/tasks/${encodeURIComponent(taskId)}`,
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'complete',
              variables: [
                { name: 'approvedCount', value: approvedCount },
                { name: 'rejectedCount', value: rejectedCount },
              ],
            }),
          },
        );

        return {
          investmentId,
          taskId,
          approvalGroup,
          decision: dto.decision,
          approvedCount,
          rejectedCount,
          approvalCompleted,
          outcome,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }
}
