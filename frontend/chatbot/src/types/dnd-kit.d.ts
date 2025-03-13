declare module '@dnd-kit/core' {
  export interface DragStartEvent {
    active: {
      id: string | number;
    };
  }

  export interface DragEndEvent {
    active: {
      id: string | number;
    };
    over?: {
      id: string | number;
    } | null;
  }

  export const DndContext: React.FC<{
    sensors: any;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    modifiers: any[];
    children: React.ReactNode;
    autoScroll?: {
      enabled?: boolean;
      speed?: number;
      threshold?: {
        x?: number;
        y?: number;
      };
    };
    measuring?: {
      droppable?: {
        strategy?: 'always' | 'once' | 'beforeDrag' | 'afterDrag';
      };
    };
    collisionDetection?: (args: {
      active: any;
      collisionRect: any;
      droppableRects: any;
      droppableContainers: any;
      pointerCoordinates: { x: number; y: number } | null;
    }) => any;
  }>;

  export const DragOverlay: React.FC<{
    children?: React.ReactNode;
    dropAnimation?: {
      duration?: number;
      easing?: string;
    };
    modifiers?: Array<(args: { transform: any }) => any>;
  }>;

  export const MouseSensor: any;
  export const TouchSensor: any;
  export function useSensor(sensor: any, options?: any): any;
  export function useSensors(...sensors: any[]): any;
  export function useDroppable(options: { id: string | number }): { setNodeRef: (element: HTMLElement | null) => void };
  export function useDraggable(options: { 
    id: string | number;
    data?: any;
  }): {
    attributes: any;
    listeners: any;
    setNodeRef: (element: HTMLElement | null) => void;
    transform: { x: number; y: number } | null;
    isDragging: boolean;
  };
}

declare module '@dnd-kit/modifiers' {
  export function restrictToVerticalAxis(args: any): any;
} 