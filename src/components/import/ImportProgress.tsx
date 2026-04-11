/**
 * ImportProgress - Shows progress during import with phase indicators
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import type { ImportPhase } from '@/types/historical';

interface PhaseInfo {
  name: string;
  description: string;
}

const PHASES: Record<ImportPhase, PhaseInfo> = {
  prepare: { name: 'Prepare', description: 'Parsing and validating CSV' },
  reconcile: { name: 'Reconcile', description: 'Matching with database records' },
  transform: { name: 'Transform', description: 'Applying date estimation and transformations' },
  execute: { name: 'Execute', description: 'Inserting records into database' },
  verify: { name: 'Verify', description: 'Validating import results' },
};

const PHASE_ORDER: ImportPhase[] = ['prepare', 'reconcile', 'transform', 'execute', 'verify'];

interface ImportProgressProps {
  currentPhase?: ImportPhase;
  progress?: number;
  message?: string;
}

export function ImportProgress({ currentPhase = 'prepare', progress = 0, message }: ImportProgressProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  const overallProgress = ((currentIndex + (progress / 100)) / PHASE_ORDER.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Importing...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Phase Indicators */}
        <div className="space-y-3">
          {PHASE_ORDER.map((phase, index) => {
            const phaseInfo = PHASES[phase];
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div
                key={phase}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  isCurrent ? 'bg-primary/10 border border-primary' : ''
                } ${isComplete ? 'opacity-75' : ''}`}
              >
                {/* Status Icon */}
                <div className="mt-0.5">
                  {isComplete && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {isCurrent && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {isPending && (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isPending ? 'text-muted-foreground' : ''}`}>
                      {phaseInfo.name}
                    </span>
                    {isCurrent && progress > 0 && (
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{phaseInfo.description}</p>

                  {/* Current Phase Progress Bar */}
                  {isCurrent && progress > 0 && (
                    <Progress value={progress} className="h-1 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Message */}
        {message && (
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
