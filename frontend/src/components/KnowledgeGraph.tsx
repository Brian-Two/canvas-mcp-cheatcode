import React, { useState, useEffect } from 'react';
import { Check, Lock, Sparkles, Circle, Brain, Plus } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import KnowledgeGraphFlow from './KnowledgeGraphFlow';

export interface ConceptNode {
  id: string;
  label: string;
  status: 'mastered' | 'in-progress' | 'mentioned' | 'locked';
  x: number;
  y: number;
  depth: number;
  connections: string[]; // IDs of connected nodes
}

interface KnowledgeGraphProps {
  concepts: ConceptNode[];
  currentConcept?: string;
  onConceptClick?: (conceptId: string) => void;
  className?: string;
  availableMindMaps?: Array<{ id: string; name: string }>;
  currentMindMapId?: string;
  onMindMapChange?: (mindMapId: string) => void;
  onCreateNewMindMap?: () => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  concepts,
  currentConcept,
  onConceptClick,
  className = '',
  availableMindMaps = [],
  currentMindMapId,
  onMindMapChange,
  onCreateNewMindMap,
}) => {
  // Use the new ReactFlow-based mind map system
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Mind Map Selector Header - render above the ReactFlow component */}
      {availableMindMaps && availableMindMaps.length > 0 && (
        <div className="absolute top-0 left-0 right-0 p-3 bg-card/80 backdrop-blur-sm border-b border-border z-20">
          <div className="flex items-center gap-2">
            <Select value={currentMindMapId || 'current'} onValueChange={onMindMapChange}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Select mind map" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Session</SelectItem>
                {availableMindMaps.map(map => (
                  <SelectItem key={map.id} value={map.id}>
                    {map.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onCreateNewMindMap && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={onCreateNewMindMap}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* ReactFlow Mind Map with bisonbytes25 layout */}
      <div className="w-full h-full" style={{ paddingTop: availableMindMaps && availableMindMaps.length > 0 ? '60px' : '0' }}>
        <KnowledgeGraphFlow
          concepts={concepts}
          currentConcept={currentConcept}
          onConceptClick={onConceptClick}
          className=""
        />
      </div>
    </div>
  );
};

export default KnowledgeGraph;

