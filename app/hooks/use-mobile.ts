import { useState, useEffect } from "react";

/**
 * 自定义 Hook: 检测当前设备是否为移动端
 * @param breakpoint - 断点宽度，默认 768px
 * @returns isMobile - 是否为移动端
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动端
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener("resize", checkMobile);

    // 清理监听器
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * 获取当前屏幕尺寸类型
 * @returns 屏幕尺寸类型: 'mobile' | 'tablet' | 'desktop'
 */
export function useScreenSize(): "mobile" | "tablet" | "desktop" {
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
    "desktop"
  );

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize("mobile");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenSize;
}

