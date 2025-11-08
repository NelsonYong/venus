import { auth } from "./next-auth";

/**
 * 获取当前用户的 session
 * 用于 API 路由中验证用户身份
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
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
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
