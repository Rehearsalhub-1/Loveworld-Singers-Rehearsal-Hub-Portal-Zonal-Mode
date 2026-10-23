'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
    Bold, Italic, AlignLeft, AlignCenter, AlignRight,
    Plus, Trash2, ChevronLeft, ChevronRight, Save,
    RotateCcw, PlusSquare
} from 'lucide-react'
import { GridCell, SpreadsheetData } from '@/types/schedule'

interface SpreadsheetEditorProps {
    initialData?: SpreadsheetData
    onChange: (data: SpreadsheetData) => void
    onSave?: (data: SpreadsheetData) => void
    isSaving?: boolean
    themeColor?: string
    readOnly?: boolean
}

const DEFAULT_COLUMNS = [
    { width: 80, label: 'Time' },
    { width: 250, label: 'Activity / Song' },
    { width: 150, label: 'Leader' },
    { width: 100, label: 'Duration' }
]

const DEFAULT_DATA: SpreadsheetData = {
    columns: DEFAULT_COLUMNS,
    rows: Array.from({ length: 15 }, () => ({ height: 40 })),
    data: {}
}

export default function SpreadsheetEditor({
    initialData,
    onChange,
    onSave,
    isSaving,
    themeColor = '#9333ea',
    readOnly = false
}: SpreadsheetEditorProps) {
    const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData>(initialData ? { ...DEFAULT_DATA, ...initialData } : DEFAULT_DATA)
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
    const [editingHeader, setEditingHeader] = useState<{ type: 'col' | 'row'; index: number } | null>(null)

    // Column Resizing State
    const [resizingCol, setResizingCol] = useState<{ index: number; startX: number; startWidth: number } | null>(null);

    // Scroll Indicator State
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Handle Scroll Indicators
    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                setCanScrollLeft(scrollLeft > 0);
                setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            checkScroll();
            window.addEventListener('resize', checkScroll);
        }

        return () => {
            if (container) container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [spreadsheet.columns]);

    // Handle Column Resize Dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingCol) return;
            const deltaX = e.clientX - resizingCol.startX;
            const newWidth = Math.max(50, resizingCol.startWidth + deltaX);

            const updatedColumns = [...spreadsheet.columns];
            updatedColumns[resizingCol.index] = { ...updatedColumns[resizingCol.index], width: newWidth };

            setSpreadsheet(prev => ({ ...prev, columns: updatedColumns }));
        };

        const handleMouseUp = () => {
            if (resizingCol) {
                setResizingCol(null);
                onChange(spreadsheet);
            }
        };

        if (resizingCol) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol, spreadsheet, onChange]);
    
    useEffect(() => {
        if (initialData) {
            setSpreadsheet({ ...DEFAULT_DATA, ...initialData })
        }
    }, [initialData])

    const handleCellChange = (row: number, col: number, value: string) => {
        const newData = { ...spreadsheet.data }
        const key = `${row}:${col}`

        if (!value) {
            delete newData[key]
        } else {
            newData[key] = { ...newData[key], value }
        }

        const updated = { ...spreadsheet, data: newData }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const toggleStyle = (style: 'bold' | 'italic') => {
        if (!selectedCell) return
        const key = `${selectedCell.row}:${selectedCell.col}`
        const newData = { ...spreadsheet.data }
        const cell = newData[key] || { value: '' }

        newData[key] = { ...cell, [style]: !cell[style] }

        const updated = { ...spreadsheet, data: newData }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const setAlignment = (align: 'left' | 'center' | 'right') => {
        if (!selectedCell) return
        const key = `${selectedCell.row}:${selectedCell.col}`
        const newData = { ...spreadsheet.data }
        const cell = newData[key] || { value: '' }

        newData[key] = { ...cell, align }

        const updated = { ...spreadsheet, data: newData }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const addRow = (index?: number) => {
        const insertIdx = typeof index === 'number' ? index : spreadsheet.rows.length
        const updatedRows = [...spreadsheet.rows]
        updatedRows.splice(insertIdx, 0, { height: 40 })

        const newData: Record<string, GridCell> = {}
        Object.entries(spreadsheet.data).forEach(([key, cell]) => {
            const [r, c] = key.split(':').map(Number)
            if (r < insertIdx) {
                newData[key] = cell
            } else {
                newData[`${r + 1}:${c}`] = cell
            }
        })

        const updated = { ...spreadsheet, rows: updatedRows, data: newData }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const deleteRow = (index: number) => {
        if (spreadsheet.rows.length <= 1) return
        const updatedRows = spreadsheet.rows.filter((_, i) => i !== index)
        const newData: Record<string, GridCell> = {}

        Object.entries(spreadsheet.data).forEach(([key, cell]) => {
            const [r, c] = key.split(':').map(Number)
            if (r < index) newData[key] = cell
            if (r > index) newData[`${r - 1}:${c}`] = cell
        })

        const updated = { ...spreadsheet, rows: updatedRows, data: newData }
        
        // Adjust selected cell
        if (selectedCell && selectedCell.row >= index) {
            if (selectedCell.row === index && index === spreadsheet.rows.length - 1) {
                setSelectedCell({ ...selectedCell, row: index - 1 })
            } else if (selectedCell.row > index) {
                setSelectedCell({ ...selectedCell, row: selectedCell.row - 1 })
            }
        }

        setSpreadsheet(updated)
        onChange(updated)
    }

    const addColumn = (index?: number) => {
        const insertIdx = typeof index === 'number' ? index : spreadsheet.columns.length
        const updatedCols = [...spreadsheet.columns]
        updatedCols.splice(insertIdx, 0, { width: 150, label: 'New Col' })

        const newData: Record<string, GridCell> = {}
        Object.entries(spreadsheet.data).forEach(([key, cell]) => {
            const [r, c] = key.split(':').map(Number)
            if (c < insertIdx) {
                newData[key] = cell
            } else {
                newData[`${r}:${c + 1}`] = cell
            }
        })

        const updated = { ...spreadsheet, columns: updatedCols, data: newData }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const deleteColumn = (index: number) => {
        if (spreadsheet.columns.length <= 1) return
        const updatedCols = spreadsheet.columns.filter((_, i) => i !== index)
        const newData: Record<string, GridCell> = {}

        Object.entries(spreadsheet.data).forEach(([key, cell]) => {
            const [r, c] = key.split(':').map(Number)
            if (c < index) newData[key] = cell
            if (c > index) newData[`${r}:${c - 1}`] = cell
        })

        const updated = { ...spreadsheet, columns: updatedCols, data: newData }
        
        // Adjust selected cell
        if (selectedCell && selectedCell.col >= index) {
            if (selectedCell.col === index && index === spreadsheet.columns.length - 1) {
                setSelectedCell({ ...selectedCell, col: index - 1 })
            } else if (selectedCell.col > index) {
                setSelectedCell({ ...selectedCell, col: selectedCell.col - 1 })
            }
        }

        setSpreadsheet(updated)
        onChange(updated)
    }

    const getColumnName = (index: number) => {
        return String.fromCharCode(65 + index)
    }

    const updateHeaderLabel = (type: 'col' | 'row', index: number, label: string) => {
        const updated = { ...spreadsheet }
        if (type === 'col') {
            updated.columns = [...updated.columns]
            updated.columns[index] = { ...updated.columns[index], label }
        } else {
            updated.rows = [...updated.rows]
            updated.rows[index] = { ...updated.rows[index], label }
        }
        setSpreadsheet(updated)
        onChange(updated)
    }

    const handleKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
        if (e.key === 'Tab') {
            e.preventDefault()
            const nextCol = cIdx + (e.shiftKey ? -1 : 1)
            if (nextCol >= 0 && nextCol < spreadsheet.columns.length) {
                setSelectedCell({ row: rIdx, col: nextCol })
            } else if (nextCol >= spreadsheet.columns.length && rIdx + 1 < spreadsheet.rows.length) {
                setSelectedCell({ row: rIdx + 1, col: 0 })
            } else if (nextCol < 0 && rIdx - 1 >= 0) {
                setSelectedCell({ row: rIdx - 1, col: spreadsheet.columns.length - 1 })
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (rIdx + 1 < spreadsheet.rows.length) {
                setSelectedCell({ row: rIdx + 1, col: cIdx })
            } else {
                addRow()
                setSelectedCell({ row: rIdx + 1, col: cIdx })
            }
        } else if (e.key === 'ArrowUp' && rIdx > 0) {
            setSelectedCell({ row: rIdx - 1, col: cIdx })
        } else if (e.key === 'ArrowDown' && rIdx < spreadsheet.rows.length - 1) {
            setSelectedCell({ row: rIdx + 1, col: cIdx })
        } else if (e.key === 'ArrowLeft' && cIdx > 0 && (e.target as HTMLInputElement).selectionStart === 0) {
            setSelectedCell({ row: rIdx, col: cIdx - 1 })
        } else if (e.key === 'ArrowRight' && cIdx < spreadsheet.columns.length - 1 && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
            setSelectedCell({ row: rIdx, col: cIdx + 1 })
        }
    }

    return (
        <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl border border-purple-200/60 rounded-2xl overflow-hidden shadow-xl shadow-purple-900/5 ring-1 ring-purple-100">
            {/* Toolbar */}
            <div className="p-2 md:p-3 bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-b border-purple-100 flex items-center gap-2 md:gap-3 flex-wrap backdrop-blur-md">
                <div className="flex items-center gap-1 bg-white/60 shadow-sm border border-purple-100 p-1 rounded-xl">
                    <button
                        onClick={() => toggleStyle('bold')}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${selectedCell && spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.bold ? 'bg-white shadow-sm text-purple-700 ring-1 ring-purple-200' : 'text-purple-600/70 hover:text-purple-700 hover:bg-white/50'}`}
                    >
                        <Bold className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                        onClick={() => toggleStyle('italic')}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${selectedCell && spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.italic ? 'bg-white shadow-sm text-purple-700 ring-1 ring-purple-200' : 'text-purple-600/70 hover:text-purple-700 hover:bg-white/50'}`}
                    >
                        <Italic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                </div>

                <div className="h-5 w-px bg-purple-200/60 mx-1" />

                <div className="flex items-center gap-1 bg-white/60 shadow-sm border border-purple-100 p-1 rounded-xl">
                    <button
                        onClick={() => setAlignment('left')}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${selectedCell && (spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.align === 'left' || !spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.align) ? 'bg-white shadow-sm text-purple-700 ring-1 ring-purple-200' : 'text-purple-600/70 hover:text-purple-700 hover:bg-white/50'}`}
                    >
                        <AlignLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                        onClick={() => setAlignment('center')}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${selectedCell && spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.align === 'center' ? 'bg-white shadow-sm text-purple-700 ring-1 ring-purple-200' : 'text-purple-600/70 hover:text-purple-700 hover:bg-white/50'}`}
                    >
                        <AlignCenter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                        onClick={() => setAlignment('right')}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${selectedCell && spreadsheet.data[`${selectedCell.row}:${selectedCell.col}`]?.align === 'right' ? 'bg-white shadow-sm text-purple-700 ring-1 ring-purple-200' : 'text-purple-600/70 hover:text-purple-700 hover:bg-white/50'}`}
                    >
                        <AlignRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                </div>

                <div className="h-5 w-px bg-purple-200/60 mx-1" />

                <div className="flex gap-2">
                    <button
                        onClick={() => addColumn()}
                        className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100/80 border border-purple-200 px-3 py-1.5 rounded-xl hover:bg-purple-200 transition-all hover:shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> Col
                    </button>
                    <button
                        onClick={() => addRow()}
                        className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100/80 border border-purple-200 px-3 py-1.5 rounded-xl hover:bg-purple-200 transition-all hover:shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> Row
                    </button>
                </div>

                <div className="flex-1" />

                {onSave && (
                    <button
                        onClick={() => onSave(spreadsheet)}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-xs font-bold text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl shadow-md shadow-fuchsia-500/20 hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: `linear-gradient(to right, ${themeColor}, #c026d3)` }}
                    >
                        {isSaving ? <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        <span className="hidden xs:inline">Save Changes</span>
                        <span className="xs:inline sm:hidden">Save</span>
                    </button>
                )}
            </div>

            {/* Grid Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 w-full overflow-auto relative rounded-b-xl pb-4 bg-white"
            >
                {canScrollRight && (
                    <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-purple-900/10 to-transparent pointer-events-none z-30" />
                )}
                {canScrollLeft && (
                    <div className="absolute top-0 left-10 bottom-0 w-8 bg-gradient-to-r from-purple-900/10 to-transparent pointer-events-none z-30" />
                )}

                <table className={`border-collapse bg-white min-w-[600px] sm:min-w-full ${resizingCol ? 'select-none' : ''}`}>
                    <thead>
                        <tr>
                            <th className="w-10 bg-purple-50/80 border border-purple-100 sticky top-0 left-0 z-20 backdrop-blur-sm"></th>
                            {spreadsheet.columns.map((col, cIdx) => (
                                <th
                                    key={cIdx}
                                    style={{ width: col.width, minWidth: Math.max(100, col.width) }}
                                    className={`bg-purple-50/80 border border-purple-100 text-[10px] font-black text-purple-600 uppercase tracking-widest py-2 px-1 sticky top-0 z-10 group relative transition-colors backdrop-blur-sm ${editingHeader?.type === 'col' && editingHeader.index === cIdx ? 'ring-2 ring-fuchsia-400 z-30' : ''}`}
                                >
                                    <div
                                        className="w-full h-full flex items-center justify-center cursor-pointer"
                                        onClick={() => setEditingHeader({ type: 'col', index: cIdx })}
                                    >
                                        {editingHeader?.type === 'col' && editingHeader.index === cIdx ? (
                                            <input
                                                autoFocus
                                                className="w-full bg-white px-2 py-1 text-xs font-bold text-slate-900 normal-case outline-none ring-2 ring-fuchsia-400 rounded-lg shadow-sm"
                                                value={col.label || ''}
                                                onChange={(e) => updateHeaderLabel('col', cIdx, e.target.value)}
                                                onBlur={() => setEditingHeader(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
                                                placeholder={`Col ${getColumnName(cIdx)}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                                <span className="opacity-70 text-purple-500">{getColumnName(cIdx)}</span>
                                                {col.label && <span className="normal-case font-bold text-purple-900 text-[10px] truncate max-w-full px-1">{col.label}</span>}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Column Controls Overlay */}
                                    <div className="absolute inset-x-0 -bottom-8 bg-white shadow-xl border border-purple-100 rounded-lg py-1 px-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all z-40 pointer-events-none group-hover:pointer-events-auto">
                                        <button onClick={(e) => { e.stopPropagation(); addColumn(cIdx); }} className="p-1 hover:bg-purple-50 text-purple-600 rounded" title="Insert Left"><PlusSquare className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteColumn(cIdx); }} className="p-1 hover:bg-rose-50 text-rose-600 rounded" title="Delete Column"><Trash2 className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); addColumn(cIdx + 1); }} className="p-1 hover:bg-purple-50 text-purple-600 rounded" title="Insert Right"><PlusSquare className="w-3 h-3" /></button>
                                    </div>

                                    {/* Column Resizer Handle */}
                                    <div
                                        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-fuchsia-400 z-30 transition-colors ${resizingCol?.index === cIdx ? 'bg-fuchsia-500' : ''}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setResizingCol({ index: cIdx, startX: e.clientX, startWidth: col.width });
                                        }}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {spreadsheet.rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ height: row.height }}>
                                <td
                                    className={`bg-purple-50/50 border border-purple-100 text-[10px] font-black text-purple-500 text-center sticky left-0 z-10 group relative cursor-pointer hover:bg-purple-100/80 transition-colors ${editingHeader?.type === 'row' && editingHeader.index === rIdx ? 'ring-2 ring-fuchsia-400 z-30' : ''}`}
                                    onClick={() => setEditingHeader({ type: 'row', index: rIdx })}
                                >
                                    {editingHeader?.type === 'row' && editingHeader.index === rIdx ? (
                                        <input
                                            autoFocus
                                            className="w-16 bg-white px-1 py-1 text-center text-xs font-bold text-slate-900 normal-case outline-none ring-2 ring-fuchsia-400 rounded-lg shadow-xl absolute left-10 top-0 z-40"
                                            value={row.label || ''}
                                            onChange={(e) => updateHeaderLabel('row', rIdx, e.target.value)}
                                            onBlur={() => setEditingHeader(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
                                            placeholder={`Row ${rIdx + 1}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="opacity-80">{rIdx + 1}</span>
                                            {row.label && <span className="normal-case font-bold text-fuchsia-600 text-[9px] truncate max-w-[36px] mt-0.5">{row.label}</span>}
                                        </div>
                                    )}

                                    {/* Row Controls Overlay */}
                                    <div className="absolute top-0 bottom-0 -right-24 bg-white shadow-xl border border-purple-100 rounded-lg py-1 px-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-40 pointer-events-none group-hover:pointer-events-auto">
                                        <button onClick={(e) => { e.stopPropagation(); addRow(rIdx); }} className="p-1 hover:bg-purple-50 text-purple-600 rounded" title="Insert Above"><PlusSquare className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteRow(rIdx); }} className="p-1 hover:bg-rose-50 text-rose-600 rounded" title="Delete Row"><Trash2 className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); addRow(rIdx + 1); }} className="p-1 hover:bg-purple-50 text-purple-600 rounded" title="Insert Below"><PlusSquare className="w-3 h-3" /></button>
                                    </div>
                                </td>
                                {spreadsheet.columns.map((_, cIdx) => {
                                    const key = `${rIdx}:${cIdx}`
                                    const cell = (spreadsheet.data as any)[key] || { value: '' }
                                    const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx

                                    return (
                                        <td
                                            key={cIdx}
                                            className={`border border-purple-100/60 p-0 transition-all ${isSelected ? 'ring-2 ring-fuchsia-400 ring-inset z-10 shadow-lg shadow-fuchsia-500/10 bg-fuchsia-50/30' : 'hover:bg-purple-50/40'}`}
                                            onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                                        >
                                            <input
                                                autoFocus={isSelected}
                                                value={cell.value}
                                                onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                                onFocus={() => setSelectedCell({ row: rIdx, col: cIdx })}
                                                className={`w-full h-full min-h-[40px] px-3 py-2 text-sm bg-transparent outline-none border-none text-slate-700 placeholder:text-purple-300
                                                    ${cell.bold ? 'font-bold text-slate-900' : ''}
                                                    ${cell.italic ? 'italic' : ''}
                                                    ${cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left'}
                                                `}
                                                placeholder=""
                                                disabled={readOnly}
                                            />
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-purple-50/80 border-t border-purple-100 flex justify-between items-center text-[10px] font-bold text-purple-600 uppercase tracking-widest backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse"></span>
                    {spreadsheet.rows.length} Rows × {spreadsheet.columns.length} Columns
                </div>
                {selectedCell && (
                    <div className="text-fuchsia-600 bg-white px-3 py-1 rounded-full shadow-sm border border-purple-100">
                        Cell {getColumnName(selectedCell.col)}{selectedCell.row + 1}
                    </div>
                )}
            </div>
        </div>
    )
}
