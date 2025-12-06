import { useState } from "react";

export function useCitations() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedCitationId, setHighlightedCitationId] = useState<
    number | undefined
  >();
  const [activeCitations, setActiveCitations] = useState<any[]>([]);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null);
  const [isExternalLinkDialogOpen, setIsExternalLinkDialogOpen] =
    useState(false);

  const handleCitationClick = (citationId: number, citations: any[]) => {
    const citation = citations.find((c) => c.id === citationId);
    if (citation?.url) {
      const disabled =
        localStorage.getItem("external-link-confirm-disabled") === "true";
      if (disabled) {
        window.open(citation.url, "_blank", "noopener,noreferrer");
      } else {
        setExternalLinkUrl(citation.url);
        setIsExternalLinkDialogOpen(true);
      }
    }
  };

  const handleExternalLinkConfirm = () => {
    if (externalLinkUrl) {
      window.open(externalLinkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenSidebar = (citations: any[]) => {
    setActiveCitations(citations);
    setHighlightedCitationId(undefined);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setHighlightedCitationId(undefined);
    setActiveCitations([]);
  };

  const handleCloseExternalLinkDialog = () => {
    setIsExternalLinkDialogOpen(false);
    setExternalLinkUrl(null);
  };

  return {
    isSidebarOpen,
    highlightedCitationId,
    activeCitations,
    externalLinkUrl,
    isExternalLinkDialogOpen,
    handleCitationClick,
    handleExternalLinkConfirm,
    handleOpenSidebar,
    handleCloseSidebar,
    handleCloseExternalLinkDialog,
  };
}
