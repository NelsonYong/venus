"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BotIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  LockIcon,
} from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // 模拟登录/注册过程
    setTimeout(() => {
      setIsLoading(false);
      // 这里可以添加实际的登录/注册逻辑
    }, 2000);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo和标题区域 */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <BotIcon className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <SparklesIcon className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">智能助手</h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "登录您的账户，开始智能对话体验"
                : "创建新账户，加入智能助手社区"}
            </p>
          </div>
        </div>

        {/* 登录/注册表单 */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  姓名
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="请输入您的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                邮箱地址
              </label>
              <Input
                id="email"
                type="email"
                placeholder="请输入您的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isLogin ? "请输入您的密码" : "设置密码（至少8位）"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                  minLength={isLogin ? undefined : 8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-foreground"
                >
                  确认密码
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {password &&
                  confirmPassword &&
                  password !== confirmPassword && (
                    <p className="text-xs text-destructive">密码不匹配</p>
                  )}
              </div>
            )}

            {isLogin ? (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">记住我</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  忘记密码？
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start space-x-2 text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 mt-0.5"
                    required
                  />
                  <span className="text-muted-foreground leading-4">
                    我已阅读并同意{" "}
                    <a href="#" className="text-primary hover:underline">
                      用户协议
                    </a>{" "}
                    和{" "}
                    <a href="#" className="text-primary hover:underline">
                      隐私政策
                    </a>
                  </span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">
                    订阅产品更新和优惠信息
                  </span>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                !email ||
                !password ||
                (!isLogin &&
                  (!name || !confirmPassword || password !== confirmPassword))
              }
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                  <span>{isLogin ? "登录中..." : "注册中..."}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{isLogin ? "登录" : "创建账户"}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "还没有账户？" : "已有账户？"}{" "}
            <button
              onClick={toggleMode}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "立即注册" : "立即登录"}
            </button>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <LockIcon className="w-4 h-4 mr-1" />
                安全保护
              </h3>
              <p className="text-xs text-muted-foreground">
                您的数据受到端到端加密保护，我们绝不会存储或分享您的个人信息。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
