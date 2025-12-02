import { auth } from "./next-auth";

export interface AuthUser {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
}

/**
 * 获取当前用户的 session
 * 用于 API 路由中验证用户身份
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();

  if (!session?.user || !session.user.id) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

/**
 * 要求用户必须登录，否则抛出错误
 * 用于需要认证的 API 路由
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
