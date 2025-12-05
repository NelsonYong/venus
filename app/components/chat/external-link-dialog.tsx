"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/app/contexts/i18n-context";

interface ExternalLinkDialogProps {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const STORAGE_KEY = "external-link-confirm-disabled";

export function ExternalLinkDialog({
  url,
  isOpen,
  onClose,
  onConfirm,
}: ExternalLinkDialogProps) {
  const { t } = useTranslation();
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // 检查是否已禁用提示
  useEffect(() => {
    const disabled = localStorage.getItem(STORAGE_KEY) === "true";
    if (disabled && url) {
      // 如果已禁用提示，直接打开链接
      window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    }
  }, [url, onClose]);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    setDontAskAgain(false);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("chat.externalLink.title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                <span className="block mb-2 text-sm text-muted-foreground">
                  {t("chat.externalLink.description")}
                </span>
                <div className="p-3 bg-muted rounded-md break-all text-sm font-mono">
                  {url}
                </div>
              </div>
              <span className="block text-muted-foreground text-xs">
                {t("chat.externalLink.warning")}
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col space-y-2">
          <div className="flex items-center space-x-2 justify-start w-full">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label
              htmlFor="dont-ask-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("chat.externalLink.dontAskAgain")}
            </label>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 w-full">
            <AlertDialogCancel onClick={handleCancel}>
              {t("chat.externalLink.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t("chat.externalLink.continue")}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
