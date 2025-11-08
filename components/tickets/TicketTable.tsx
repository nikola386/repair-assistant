'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { RepairTicket } from '../../types/ticket'
import { useLanguage } from '../../contexts/LanguageContext'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { filterPersistence } from '@/lib/filterPersistence'

interface TicketTableProps {
  tickets: RepairTicket[]
}

export default function TicketTable({ tickets }: TicketTableProps) {
  const { t } = useLanguage()
  
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window !== 'undefined') {
      const saved = filterPersistence.loadTicketsSorting()
      return saved || []
    }
    return []
  })
  const [columnFilters] = useState<ColumnFiltersState>([])
  
  useEffect(() => {
    filterPersistence.saveTicketsSorting(sorting)
  }, [sorting])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusClass = (status: string) => {
    return `ticket-status ticket-status--${status}`
  }

  const getPriorityClass = (priority: string) => {
    return `ticket-priority ticket-priority--${priority}`
  }

  const columns: ColumnDef<RepairTicket>[] = useMemo(
    () => [
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket #',
        enableSorting: true,
        cell: (info) => {
          const ticket = info.row.original
          return (
            <Link href={`/tickets/${ticket.id}`} className="table__link">
              <span className="table__number">{info.getValue() as string}</span>
            </Link>
          )
        },
      },
      {
        accessorKey: 'customerName',
        header: t.tickets.form?.customerName || 'Customer',
        enableSorting: true,
        cell: (info) => {
          const ticket = info.row.original
          return (
            <Link href={`/clients/${ticket.customerId}`} className="table__link">
              <span className="table__customer">{info.getValue() as string}</span>
            </Link>
          )
        },
      },
      {
        id: 'device',
        header: t.tickets.deviceInfo || 'Device',
        enableSorting: false,
        accessorFn: (row) => `${row.deviceType}${row.deviceBrand ? ` • ${row.deviceBrand}` : ''}${row.deviceModel ? ` ${row.deviceModel}` : ''}`,
        cell: (info) => {
          const ticket = info.row.original
          const deviceInfo = `${ticket.deviceType}${ticket.deviceBrand ? ` • ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}`
          return (
            <Link href={`/tickets/${ticket.id}`} className="table__link">
              <span className="table__device">{deviceInfo}</span>
            </Link>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: t.common.dates.date,
        enableSorting: true,
        sortingFn: 'datetime',
        cell: (info) => {
          const ticket = info.row.original
          return (
            <Link href={`/tickets/${ticket.id}`} className="table__link">
              <span className="table__date">{formatDate(info.getValue() as string)}</span>
            </Link>
          )
        },
      },
      {
        accessorKey: 'estimatedCost',
        header: t.tickets.estimatedCost || 'Cost',
        enableSorting: true,
        cell: (info) => {
          const ticket = info.row.original
          const cost = info.getValue() as number | undefined
          return (
            <Link href={`/tickets/${ticket.id}`} className="table__link table__link--cost">
              <span className="table__cost">
                {cost ? `$${cost.toFixed(2)}` : '—'}
              </span>
            </Link>
          )
        },
      },
      {
        accessorKey: 'status',
        header: t.common.fields.status,
        enableSorting: true,
        cell: (info) => {
          const ticket = info.row.original
          const status = info.getValue() as string
        return (
          <Link href={`/tickets/${ticket.id}`} className="table__link">
            <span className={getStatusClass(status)}>
              {t.common.status[status as keyof typeof t.common.status] || status}
            </span>
          </Link>
        )
        },
      },
      {
        accessorKey: 'priority',
        header: t.common.fields.priority,
        enableSorting: true,
        cell: (info) => {
          const ticket = info.row.original
          const priority = info.getValue() as string
        return (
          <Link href={`/tickets/${ticket.id}`} className="table__link">
            <span className={getPriorityClass(priority)}>
              {t.common.priority[priority as keyof typeof t.common.priority] || priority}
            </span>
          </Link>
        )
        },
      },
    ],
    [t]
  )

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  const getColumnClass = (id: string): string => {
    if (id === 'ticketNumber') return 'number'
    if (id === 'customerName') return 'customer'
    if (id === 'device') return 'device'
    if (id === 'createdAt') return 'date'
    if (id === 'estimatedCost') return 'cost'
    if (id === 'status') return 'status'
    if (id === 'priority') return 'priority'
    return 'number'
  }

  return (
    <div className="ticket-list__table-wrapper">
      <div className="ticket-list__table-container">
        <table className="ticket-list__table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id
                  const canSort = header.column.getCanSort()
                  
                  return (
                    <th
                      key={header.id}
                      className={`ticket-list__th ticket-list__th--${getColumnClass(columnId)} ${canSort ? 'ticket-list__th--sortable' : ''}`}
                      style={{ cursor: canSort ? 'pointer' : 'default' }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="ticket-list__th-content">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="ticket-list__sort-indicator">
                            {{
                              asc: ' ▲',
                              desc: ' ▼',
                            }[header.column.getIsSorted() as string] ?? ' ↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="ticket-card ticket-card--list">
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id
                    
                    return (
                      <td
                        key={cell.id}
                        className={`ticket-card__td ticket-card__td--${getColumnClass(columnId)}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="ticket-list__empty-cell">
                  <div className="ticket-list__empty">
                    <p>{ t.tickets.noTicketsFound || 'No tickets found'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

