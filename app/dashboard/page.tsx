'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  HiCog,
  HiClock,
  HiCheckCircle,
  HiTrendingUp,
  HiTrendingDown,
  HiChartBar,
  HiSearch,
  HiExclamation,
  HiFire,
  HiArrowUp,
  HiArrowDown,
  HiCube,
  HiUsers,
} from 'react-icons/hi'
import { FaWrench, FaStopwatch, FaDollarSign } from 'react-icons/fa'
import ExpiringWarrantiesWidget from '@/components/warranties/ExpiringWarrantiesWidget'

interface ChartDataPoint {
  date: string
  income: number
  expenses: number
  profit: number
  profitPercentage: number
}

interface StatusDistributionItem {
  status: string
  count: number
  percentage: number
}

interface DashboardStats {
  totalRepairs: number
  inProgressRepairs: number
  waitingRepairs: number
  income: number
  expenses: number
  grossProfit: number
  grossProfitPercentage: number
  averageRepairTime: number
  completionRate: number
  chartData: ChartDataPoint[]
  overdueTickets: number
  highPriorityTickets: number
  totalClients: number
  revenueGrowth: number | null
  lowStockItems: number
  statusDistribution: StatusDistributionItem[]
}

type Period = '7d' | '30d' | '180d' | '360d'
type ChartType = 'income' | 'expenses' | 'profit' | null

export default function DashboardPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalRepairs: 0,
    inProgressRepairs: 0,
    waitingRepairs: 0,
    income: 0,
    expenses: 0,
    grossProfit: 0,
    grossProfitPercentage: 0,
    averageRepairTime: 0,
    completionRate: 0,
    chartData: [],
    overdueTickets: 0,
    highPriorityTickets: 0,
    totalClients: 0,
    revenueGrowth: null,
    lowStockItems: 0,
    statusDistribution: [],
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [openChart, setOpenChart] = useState<ChartType>(null)

  useEffect(() => {
    fetchStats(period)
  }, [period])

  const fetchStats = async (selectedPeriod: Period) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/stats?period=${selectedPeriod}`)
      if (!response.ok) {
        setStats({
          totalRepairs: 0,
          inProgressRepairs: 0,
          waitingRepairs: 0,
          income: 0,
          expenses: 0,
          grossProfit: 0,
          grossProfitPercentage: 0,
          averageRepairTime: 0,
          completionRate: 0,
          chartData: [],
          overdueTickets: 0,
          highPriorityTickets: 0,
          totalClients: 0,
          revenueGrowth: null,
          lowStockItems: 0,
          statusDistribution: [],
        })
        return
      }
      const data = await response.json()
      setStats({
        totalRepairs: data.totalRepairs ?? 0,
        inProgressRepairs: data.inProgressRepairs ?? 0,
        waitingRepairs: data.waitingRepairs ?? 0,
        income: data.income ?? 0,
        expenses: data.expenses ?? 0,
        grossProfit: data.grossProfit ?? 0,
        grossProfitPercentage: data.grossProfitPercentage ?? 0,
        averageRepairTime: data.averageRepairTime ?? 0,
        completionRate: data.completionRate ?? 0,
        chartData: data.chartData ?? [],
        overdueTickets: data.overdueTickets ?? 0,
        highPriorityTickets: data.highPriorityTickets ?? 0,
        totalClients: data.totalClients ?? 0,
        revenueGrowth: data.revenueGrowth ?? null,
        lowStockItems: data.lowStockItems ?? 0,
        statusDistribution: data.statusDistribution ?? [],
      })
    } catch (err) {
      setStats({
        totalRepairs: 0,
        inProgressRepairs: 0,
        waitingRepairs: 0,
        income: 0,
        expenses: 0,
        grossProfit: 0,
        grossProfitPercentage: 0,
        averageRepairTime: 0,
        completionRate: 0,
        chartData: [],
        overdueTickets: 0,
        highPriorityTickets: 0,
        totalClients: 0,
        revenueGrowth: null,
        lowStockItems: 0,
        statusDistribution: [],
      })
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  const formatDays = (days: number): string => {
    if (days === 0) return `0 ${t.dashboard?.stats?.days || 'days'}`
    if (days < 1) return `${Math.round(days * 24)} ${t.dashboard?.stats?.hours || 'hours'}`
    if (days === 1) return `1 ${t.dashboard?.stats?.day || 'day'}`
    return `${days.toFixed(1)} ${t.dashboard?.stats?.days || 'days'}`
  }

  const getPeriodLabel = (p: Period): string => {
    const labels: Record<Period, string> = {
      '7d': t.dashboard?.periods?.last7Days || 'Last 7 Days',
      '30d': t.dashboard?.periods?.last30Days || 'Last 30 Days',
      '180d': t.dashboard?.periods?.last180Days || 'Last 180 Days',
      '360d': t.dashboard?.periods?.last360Days || 'Last 360 Days',
    }
    return labels[p]
  }

  const formatChartDate = (dateString: string): string => {
    if (dateString.includes('-') && dateString.length === 10) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (dateString.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateString.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    return dateString
  }

  const getChartTitle = (chartType: ChartType): string => {
    switch (chartType) {
      case 'income':
        return t.dashboard?.stats?.income || 'Income'
      case 'expenses':
        return t.dashboard?.stats?.expenses || 'Expenses'
      case 'profit':
        return t.dashboard?.stats?.grossProfit || 'Gross Profit'
      default:
        return ''
    }
  }

  const getChartDataKey = (chartType: ChartType): string => {
    switch (chartType) {
      case 'income':
        return 'income'
      case 'expenses':
        return 'expenses'
      case 'profit':
        return 'profit'
      default:
        return ''
    }
  }

  const getChartColor = (chartType: ChartType): string => {
    switch (chartType) {
      case 'income':
        return '#4CAF50'
      case 'expenses':
        return '#F44336'
      case 'profit':
        return '#2196F3'
      default:
        return '#000000'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FFF3CD'
      case 'in_progress':
        return '#D1ECF1'
      case 'waiting_parts':
        return '#F8D7DA'
      case 'completed':
        return '#D4EDDA'
      case 'cancelled':
        return '#E2E3E5'
      default:
        return '#E2E3E5'
    }
  }

  const getStatusBorderColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FFC107' // Amber
      case 'in_progress':
        return '#2196F3' // Blue
      case 'waiting_parts':
        return '#FF5722' // Deep Orange
      case 'completed':
        return '#4CAF50' // Green
      case 'cancelled':
        return '#9E9E9E' // Grey
      default:
        return '#9E9E9E'
    }
  }

  const getStatusLabel = (status: string): string => {
    return t.common?.status?.[status as keyof typeof t.common.status] || status
  }

  const handleStatCardClick = (path: string) => {
    router.push(path)
  }

  const renderFullChart = () => {
    if (!openChart || !stats.chartData || stats.chartData.length === 0) return null

    const dataKey = getChartDataKey(openChart)
    const color = getChartColor(openChart)

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={stats.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            style={{ fontSize: '14px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => {
              if (openChart === 'profit' || openChart === 'income' || openChart === 'expenses') {
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
                return `$${value}`
              }
              return `${value.toFixed(0)}%`
            }}
            style={{ fontSize: '14px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--white)',
              border: '2px solid var(--border-gray)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            formatter={(value: number) => {
              const formattedValue = openChart === 'profit' || openChart === 'income' || openChart === 'expenses'
                ? formatCurrency(value)
                : `${value.toFixed(1)}%`
              const label = getChartTitle(openChart)
              return [formattedValue, label]
            }}
            labelFormatter={(label) => formatChartDate(label)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={getChartTitle(openChart)}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 8 }}
          />
          <Brush
            dataKey="date"
            tickFormatter={formatChartDate}
            height={30}
            stroke={color}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }


  return (
    <>
      <Navigation />
      <main className="dashboard-page">
        <div className="container">
          <div className="dashboard-page__header">
            <h1>{t.dashboard?.title || 'Dashboard'}</h1>
            <div className="dashboard-page__period-selector">
              <label htmlFor="period-select">{t.dashboard?.selectPeriod || 'Select Period'}:</label>
              <select
                id="period-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="dashboard-page__select"
              >
                <option value="7d">{t.dashboard?.periods?.last7Days || 'Last 7 Days'}</option>
                <option value="30d">{t.dashboard?.periods?.last30Days || 'Last 30 Days'}</option>
                <option value="180d">{t.dashboard?.periods?.last180Days || 'Last 180 Days'}</option>
                <option value="360d">{t.dashboard?.periods?.last360Days || 'Last 360 Days'}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-page__loading">
              <Spinner />
            </div>
          ) : (
            <div className="dashboard-page__stats">
              <div className="dashboard-stats-grid">
                <div 
                  className="stat-card stat-card--repairs stat-card--clickable"
                  onClick={() => handleStatCardClick('/tickets')}
                >
                  <div className="stat-card__icon">
                    <FaWrench />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.totalRepairs || 'Total Repairs'}
                    </h3>
                    <p className="stat-card__value">{stats.totalRepairs}</p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--in-progress stat-card--clickable"
                  onClick={() => handleStatCardClick('/tickets?status=in_progress')}
                >
                  <div className="stat-card__icon">
                    <HiCog />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.inProgress || 'In Progress'}
                    </h3>
                    <p className="stat-card__value">{stats.inProgressRepairs}</p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--waiting stat-card--clickable"
                  onClick={() => handleStatCardClick('/tickets?status=waiting_parts')}
                >
                  <div className="stat-card__icon">
                    <HiClock />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.waiting || 'Waiting'}
                    </h3>
                    <p className="stat-card__value">{stats.waitingRepairs}</p>
                  </div>
                </div>

                <div className="stat-card stat-card--repair-time">
                  <div className="stat-card__icon">
                    <FaStopwatch />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.averageRepairTime || 'Average Repair Time'}
                    </h3>
                    <p className="stat-card__value">{formatDays(stats.averageRepairTime)}</p>
                  </div>
                </div>

                <div className="stat-card stat-card--completion">
                  <div className="stat-card__icon">
                    <HiCheckCircle />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.completionRate || 'Completion Rate'}
                    </h3>
                    <p className="stat-card__value">{formatPercentage(stats.completionRate)}</p>
                  </div>
                </div>

                <div className="stat-card stat-card--profit-percentage">
                  <div className="stat-card__icon">
                    <HiTrendingUp />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.grossProfitPercentage || 'Gross Profit %'}
                    </h3>
                    <p className="stat-card__value">{formatPercentage(stats.grossProfitPercentage)}</p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--overdue stat-card--clickable"
                  onClick={() => handleStatCardClick('/tickets')}
                  title={t.dashboard?.stats?.overdueTickets || 'Overdue Tickets - Click to view all tickets'}
                >
                  <div className="stat-card__icon">
                    <HiExclamation />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.overdueTickets || 'Overdue Tickets'}
                    </h3>
                    <p className="stat-card__value">{stats.overdueTickets}</p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--high-priority stat-card--clickable"
                  onClick={() => handleStatCardClick('/tickets?priority=high,urgent')}
                >
                  <div className="stat-card__icon">
                    <HiFire />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.highPriorityTickets || 'High Priority Tickets'}
                    </h3>
                    <p className="stat-card__value">{stats.highPriorityTickets}</p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--clients stat-card--clickable"
                  onClick={() => handleStatCardClick('/clients')}
                >
                  <div className="stat-card__icon">
                    <HiUsers />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.totalClients || 'Total Clients'}
                    </h3>
                    <p className="stat-card__value">{stats.totalClients}</p>
                  </div>
                </div>

                <div className="stat-card stat-card--revenue-growth">
                  <div className="stat-card__icon">
                    {stats.revenueGrowth !== null && stats.revenueGrowth >= 0 ? (
                      <HiArrowUp />
                    ) : stats.revenueGrowth !== null ? (
                      <HiArrowDown />
                    ) : (
                      <HiTrendingUp />
                    )}
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.revenueGrowth || 'Revenue Growth'}
                    </h3>
                    <p className="stat-card__value">
                      {stats.revenueGrowth !== null ? formatPercentage(stats.revenueGrowth) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div 
                  className="stat-card stat-card--low-stock stat-card--clickable"
                  onClick={() => handleStatCardClick('/inventory?lowStock=true')}
                >
                  <div className="stat-card__icon">
                    <HiCube />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.lowStockItems || 'Low Stock Items'}
                    </h3>
                    <p className="stat-card__value">{stats.lowStockItems}</p>
                  </div>
                </div>

                {/* Expenses Stat Card */}
                <div className="stat-card stat-card--expenses">
                  <div className="stat-card__icon">
                    <HiTrendingDown />
                  </div>
                  <div className="stat-card__content">
                    <h3 className="stat-card__label">
                      {t.dashboard?.stats?.expenses || 'Expenses'}
                    </h3>
                    <p className="stat-card__value">{formatCurrency(stats.expenses)}</p>
                  </div>
                </div>

              </div>

              {/* Chart cards in 3-column grid */}
              <div className="dashboard-charts-grid">
                <div className="stat-card stat-card--income stat-card--with-chart">
                  <div className="stat-card__header">
                    <div className="stat-card__icon">
                      <FaDollarSign />
                    </div>
                    <div className="stat-card__content">
                      <h3 className="stat-card__label">
                        {t.dashboard?.stats?.income || 'Income'}
                      </h3>
                      <p className="stat-card__value">{formatCurrency(stats.income)}</p>
                    </div>
                    {stats.chartData && stats.chartData.length > 0 && (
                      <button
                        className="stat-card__zoom-btn"
                        onClick={() => setOpenChart('income')}
                        aria-label="Zoom chart"
                        title="View full chart"
                      >
                        <HiSearch />
                      </button>
                    )}
                  </div>
                  {stats.chartData && stats.chartData.length > 0 && (
                    <div className="stat-card__chart">
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={stats.chartData} margin={{ top: 5, right: 5, left: 25, bottom: 5 }}>
                          <YAxis
                            width={40}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
                              return `$${value}`
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--border-gray)',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [
                              formatCurrency(value),
                              t.dashboard?.stats?.income || 'Income',
                            ]}
                            labelFormatter={(label) => formatChartDate(label)}
                          />
                          <Line
                            type="monotone"
                            dataKey="income"
                            stroke="#4CAF50"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Status Distribution Pie Chart */}
                {stats.statusDistribution && stats.statusDistribution.length > 0 && (
                  <div className="stat-card stat-card--status-distribution stat-card--with-chart">
                    <div className="stat-card__header">
                      <div className="stat-card__icon">
                        <HiChartBar />
                      </div>
                      <div className="stat-card__content">
                        <h3 className="stat-card__label">
                          {t.dashboard?.stats?.statusDistribution || 'Status Distribution'}
                        </h3>
                      </div>
                    </div>
                    <div className="stat-card__chart">
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={stats.statusDistribution as any}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(props: any) => {
                              const percentage = props.payload?.percentage || 0
                              return percentage > 5 ? `${percentage}%` : ''
                            }}
                            outerRadius={50}
                            fill="#8884d8"
                            dataKey="count"
                            onClick={(data: any) => {
                              if (data && data.payload && data.payload.status) {
                                handleStatCardClick(`/tickets?status=${data.payload.status}`)
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {stats.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getStatusBorderColor(entry.status)} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--white)',
                              border: '2px solid var(--border-gray)',
                              borderRadius: '8px',
                              padding: '12px',
                              fontSize: '14px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value} (${props.payload.percentage}%)`,
                              getStatusLabel(props.payload.status),
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="stat-card__legend" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem' }}>
                      {stats.statusDistribution.map((item) => (
                        <div
                          key={item.status}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              backgroundColor: getStatusBorderColor(item.status),
                              borderRadius: '3px',
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{getStatusLabel(item.status)}:</span>
                          <span>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="stat-card stat-card--profit stat-card--with-chart">
                  <div className="stat-card__header">
                    <div className="stat-card__icon">
                      <HiChartBar />
                    </div>
                    <div className="stat-card__content">
                      <h3 className="stat-card__label">
                        {t.dashboard?.stats?.grossProfit || 'Gross Profit'}
                      </h3>
                      <p className="stat-card__value">{formatCurrency(stats.grossProfit)}</p>
                    </div>
                    {stats.chartData && stats.chartData.length > 0 && (
                      <button
                        className="stat-card__zoom-btn"
                        onClick={() => setOpenChart('profit')}
                        aria-label="Zoom chart"
                        title="View full chart"
                      >
                        <HiSearch />
                      </button>
                    )}
                  </div>
                  {stats.chartData && stats.chartData.length > 0 && (
                    <div className="stat-card__chart">
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={stats.chartData} margin={{ top: 5, right: 5, left: 25, bottom: 5 }}>
                          <YAxis
                            width={40}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
                              return `$${value}`
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--border-gray)',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [
                              formatCurrency(value),
                              t.dashboard?.stats?.grossProfit || 'Gross Profit',
                            ]}
                            labelFormatter={(label) => formatChartDate(label)}
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#2196F3"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

              </div>

              {/* Warranty Widget */}
              <div className="dashboard-widgets-grid">
                <ExpiringWarrantiesWidget daysAhead={30} />
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Chart Modal */}
      {openChart && (
        <div className="chart-modal" onClick={() => setOpenChart(null)}>
          <div className="chart-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="chart-modal__header">
              <h2 className="chart-modal__title">{getChartTitle(openChart)}</h2>
              <button
                className="chart-modal__close"
                onClick={() => setOpenChart(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="chart-modal__chart">
              {renderFullChart()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

