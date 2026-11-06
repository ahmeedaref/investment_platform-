import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { keycloakConfig } from "./keycloak.config";

const JWKS = createRemoteJWKSet(new URL(keycloakConfig.jwksUri));

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing or invalid authorization header",
      );
    }

    const token = authHeader.substring(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: keycloakConfig.issuer,
      });

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
