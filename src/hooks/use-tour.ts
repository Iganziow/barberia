"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_STEPS } from "@/lib/tour-steps";

const STORAGE_KEY = "marbrava_tour_done";

export function useTour() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    Promise.resolve().then(() => {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setCurrentStep(0);
      }
    });
  }, []);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null) return null;
      if (prev >= TOUR_STEPS.length - 1) {
        localStorage.setItem(STORAGE_KEY, "1");
        return null;
      }
      return prev + 1;
    });
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setCurrentStep(null);
  }, []);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
  }, []);

  return {
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: currentStep !== null ? TOUR_STEPS[currentStep] : null,
    isActive: currentStep !== null,
    next,
    skip,
    restart,
  };
}
