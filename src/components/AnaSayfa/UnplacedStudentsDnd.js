import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Box, Chip } from '@mui/material';

// Drag & Drop item types
export const ITEM_TYPES = {
    STUDENT: 'student'
};

// Unplaced Students Drop Zone Component
export const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: 'unplaced-students-zone',
        data: {
            type: 'unplaced-zone'
        }
    });

    const isActive = isOver;
    let backgroundColor = 'grey.50';
    if (isActive) {
        backgroundColor = 'rgba(255, 193, 7, 0.1)'; // Sarı vurgu
    }

    return (
        <Box
            ref={setNodeRef}
            sx={{
                backgroundColor: backgroundColor,
                borderRadius: 2,
                border: '2px dashed',
                borderColor: isActive ? 'warning.main' : 'grey.300',
                transition: 'border-color 0.1s ease, background-color 0.1s ease',
                '&:hover': {
                    borderColor: 'warning.main',
                },
                p: 2,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1
            }}
        >
            {children}
        </Box>
    );
};

// Draggable Unplaced Student Component
export const DraggableUnplacedStudent = ({ ogrenci }) => {
    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: `unplaced-student-${ogrenci.id}`,
        data: {
            type: ITEM_TYPES.STUDENT,
            ogrenci: ogrenci,
            masaId: null
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <Chip
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            label={`${ogrenci.ad} (${ogrenci.sinif})`}
            variant="outlined"
            color="warning"
            sx={{
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
                '&:active': {
                    cursor: 'grabbing'
                },
                m: 0.5
            }}
            title={`${ogrenci.ad} - ${ogrenci.sinif} - ${ogrenci.cinsiyet || 'Cinsiyet belirtilmemiş'}`}
        />
    );
};
