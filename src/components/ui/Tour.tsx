"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTour } from "@/hooks/use-tour";
import type { TourStep } from "@/lib/tour-steps";

type Rect = { top: number; left: number; width: number; height: number };

function getTargetRect(targetId: string): Rect | null {
  const el = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function getTooltipStyle(rect: Rect | null, position: TourStep["position"]) {
  if (position === "center" || !rect) {
    return {
      position: "fixed" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
    };
  }

  const gap = 12;
  const style: React.CSSProperties = { position: "fixed", zIndex: 9999 };

  switch (position) {
    case "bottom":
      style.top = rect.top + rect.height + gap;
      style.left = Math.min(Math.max(rect.left + rect.width / 2, 150), window.innerWidth - 150);
      style.transform = "translateX(-50%)";
      break;
    case "top":
      style.bottom = window.innerHeight - rect.top + gap;
      style.left = Math.min(Math.max(rect.left + rect.width / 2, 150), window.innerWidth - 150);
      style.transform = "translateX(-50%)";
      break;
    case "right":
      style.top = rect.top + rect.height / 2;
      style.left = rect.left + rect.width + gap;
      style.transform = "translateY(-50%)";
      break;
    case "left":
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + gap;
      style.transform = "translateY(-50%)";
      break;
  }

  return style;
}

function TourTooltip({
  step,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  targetRect,
}: {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  targetRect: Rect | null;
}) {
  const isLast = currentStep === totalSteps - 1;
  const isCenter = step.position === "center";
  const tooltipStyle = getTooltipStyle(targetRect, step.position);

  const spotlightStyle: React.CSSProperties | null =
    targetRect && !isCenter
      ? {
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          boxShadow: `0 0 0 9999px rgba(0,0,0,0.45)`,
          clipPath: `polygon(
            0% 0%, 0% 100%, ${targetRect.left - 4}px 100%, ${targetRect.left - 4}px ${targetRect.top - 4}px,
            ${targetRect.left + targetRect.width + 4}px ${targetRect.top - 4}px,
            ${targetRect.left + targetRect.width + 4}px ${targetRect.top + targetRect.height + 4}px,
            ${targetRect.left - 4}px ${targetRect.top + targetRect.height + 4}px,
            ${targetRect.left - 4}px 100%, 100% 100%, 100% 0%
          )`,
          pointerEvents: "none",
        }
      : null;

  return (
    <>
      {/* Dark overlay */}
      {spotlightStyle ? (
        <div style={spotlightStyle} />
      ) : (
        <div className="fixed inset-0 z-[9998] bg-black/50" style={{ pointerEvents: "none" }} />
      )}

      {/* Click blocker */}
      <div className="fixed inset-0 z-[9998]" onClick={onSkip} aria-hidden="true" />

      {/* Tooltip */}
      <div style={tooltipStyle} className="max-w-xs w-80" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-xl bg-white p-5 shadow-2xl border border-[#e8e2dc]">
          {isCenter && (
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-2xl">
                ✂️
              </div>
            </div>
          )}
          <h3 className={`font-bold text-stone-900 ${isCenter ? "text-center text-base" : "text-sm"}`}>
            {step.title}
          </h3>
          <p className={`mt-2 text-xs text-stone-500 leading-relaxed ${isCenter ? "text-center" : ""}`}>
            {step.description}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition ${
                    i === currentStep ? "bg-brand w-4" : i < currentStep ? "bg-brand/40 w-1.5" : "bg-stone-200 w-1.5"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSkip} className="text-xs text-stone-400 hover:text-stone-600">
                Saltar
              </button>
              <button
                onClick={onNext}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition"
              >
                {isLast ? "Entendido" : currentStep === 0 ? "Comenzar" : "Siguiente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TourOverlay() {
  const { currentStep, totalSteps, step, isActive, next, skip } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);
  const pathname = usePathname();
  const missingRetries = useRef(0);

  useEffect(() => {
    if (!step || !isActive) return;

    // Center steps don't need a target — use cleanup to reset rect
    if (step.position === "center" || !step.targetId) {
      return () => { /* no target tracking needed for center steps */ };
    }

    function updateRect() {
      const rect = getTargetRect(step!.targetId!);
      if (rect) {
        setTargetRect(rect);
        missingRetries.current = 0;
      } else {
        missingRetries.current++;
        if (missingRetries.current > 10) {
          missingRetries.current = 0;
          next();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(updateRect);
    }

    const timer = setTimeout(() => {
      updateRect();
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      setTargetRect(null);
      missingRetries.current = 0;
    };
  }, [step, isActive, next, pathname]);

  if (!isActive || !step || currentStep === null) return null;
  // For targeted steps, wait for target rect
  if (step.targetId && step.position !== "center" && !targetRect) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <TourTooltip
      step={step}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={next}
      onSkip={skip}
      targetRect={targetRect}
    />,
    document.body
  );
}
