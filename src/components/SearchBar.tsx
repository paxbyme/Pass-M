'use client'

import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  X,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc' | 'strength-asc' | 'strength-desc' | 'accessed-desc'
export type StrengthFilter = 'all' | 'weak' | 'fair' | 'strong'

export interface SearchBarProps {
  onSearch: (query: string) => void
  onCategoryFilter: (category: string | null) => void
  onTagFilter: (tag: string | null) => void
  onStrengthFilter: (level: StrengthFilter) => void
  onSort: (sort: SortOption) => void
  categories?: string[]
  tags?: string[]
  /** Current active values — used for displaying active filter badges */
  activeCategory?: string | null
  activeTag?: string | null
  activeStrength?: StrengthFilter
  activeSort?: SortOption
  className?: string
}

// ---------------------------------------------------------------------------
// Small dropdown
// ---------------------------------------------------------------------------

interface SimpleDropdownProps {
  label: string
  value: string | null
  options: { label: string; value: string | null }[]
  onChange: (v: string | null) => void
  icon?: React.ReactNode
}

function SimpleDropdown({ label, value, options, onChange, icon }: SimpleDropdownProps) {
  const activeLabel = options.find((o) => o.value === value)?.label ?? label

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm',
            'border border-navy-700/50 bg-navy-900/50',
            'text-muted-foreground hover:text-foreground hover:bg-navy-800/60',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            value && value !== 'all' && 'border-accent-500/40 text-accent-400'
          )}
          aria-label={`Filter by ${label}`}
        >
          {icon}
          <span className="hidden sm:block">{activeLabel}</span>
          <ChevronDown size={13} className="opacity-60" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-[160px] rounded-lg p-1',
            'border border-navy-700/50',
            'bg-[hsl(240_10%_8%/0.97)] backdrop-blur-xl',
            'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
            'animate-scale-in'
          )}
          sideOffset={4}
          align="start"
        >
          {options.map((opt) => (
            <DropdownMenu.Item
              key={String(opt.value)}
              onSelect={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer',
                'text-muted-foreground hover:text-foreground hover:bg-white/5',
                'focus:outline-none focus:bg-white/8',
                'transition-colors duration-100',
                opt.value === value && 'text-accent-400 bg-accent-500/10'
              )}
            >
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Name A→Z', value: 'name-asc' },
  { label: 'Name Z→A', value: 'name-desc' },
  { label: 'Newest', value: 'created-desc' },
  { label: 'Oldest', value: 'created-asc' },
  { label: 'Weakest first', value: 'strength-asc' },
  { label: 'Strongest first', value: 'strength-desc' },
  { label: 'Recently accessed', value: 'accessed-desc' },
]

const STRENGTH_OPTIONS: { label: string; value: StrengthFilter }[] = [
  { label: 'All strengths', value: 'all' },
  { label: 'Weak', value: 'weak' },
  { label: 'Fair', value: 'fair' },
  { label: 'Strong', value: 'strong' },
]

export function SearchBar({
  onSearch,
  onCategoryFilter,
  onTagFilter,
  onStrengthFilter,
  onSort,
  categories = [],
  tags = [],
  activeCategory = null,
  activeTag = null,
  activeStrength = 'all',
  activeSort = 'name-asc',
  className,
}: SearchBarProps) {
  const [query, setQuery] = React.useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleSearch(value: string) {
    setQuery(value)
    onSearch(value)
  }

  function clearSearch() {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }

  const activeFilterCount = [
    activeCategory,
    activeTag,
    activeStrength !== 'all' ? activeStrength : null,
  ].filter(Boolean).length

  const categoryOptions = [
    { label: 'All categories', value: null },
    ...categories.map((c) => ({ label: c, value: c })),
  ]

  const tagOptions = [
    { label: 'All tags', value: null },
    ...tags.map((t) => ({ label: t, value: t })),
  ]

  const filterPanel = (
    <div className={cn('flex flex-wrap items-center gap-2')}>
      {/* Category */}
      {categories.length > 0 && (
        <SimpleDropdown
          label="Category"
          value={activeCategory}
          options={categoryOptions}
          onChange={onCategoryFilter}
        />
      )}

      {/* Tag */}
      {tags.length > 0 && (
        <SimpleDropdown
          label="Tag"
          value={activeTag}
          options={tagOptions}
          onChange={onTagFilter}
        />
      )}

      {/* Strength */}
      <SimpleDropdown
        label="Strength"
        value={activeStrength}
        options={STRENGTH_OPTIONS}
        onChange={(v) => onStrengthFilter((v as StrengthFilter) ?? 'all')}
      />

      {/* Sort */}
      <SimpleDropdown
        label="Sort"
        value={activeSort}
        options={SORT_OPTIONS}
        onChange={(v) => onSort((v as SortOption) ?? 'name-asc')}
        icon={<ArrowUpDown size={13} />}
      />
    </div>
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Top row: search + mobile filter toggle */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={15} />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search credentials…"
            className={cn(
              'flex h-9 w-full rounded-lg pl-9 pr-8 py-2 text-sm',
              'bg-navy-900 border border-navy-700/60',
              'text-foreground placeholder:text-muted-foreground',
              'transition-colors duration-150',
              'focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40',
            )}
            aria-label="Search credentials"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Desktop filters — inline */}
        <div className="hidden md:flex items-center gap-2">
          {filterPanel}
        </div>

        {/* Mobile filter toggle */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden relative"
          onClick={() => setMobileFiltersOpen((o) => !o)}
          aria-label="Toggle filters"
          aria-expanded={mobileFiltersOpen}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile filter panel */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
          >
            <div className="pt-1">
              {filterPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter badges */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap gap-1.5"
          >
            {activeCategory && (
              <Badge variant="accent" className="gap-1 cursor-pointer" onClick={() => onCategoryFilter(null)}>
                {activeCategory}
                <X size={10} />
              </Badge>
            )}
            {activeTag && (
              <Badge variant="default" className="gap-1 cursor-pointer" onClick={() => onTagFilter(null)}>
                #{activeTag}
                <X size={10} />
              </Badge>
            )}
            {activeStrength && activeStrength !== 'all' && (
              <Badge variant="warning" className="gap-1 cursor-pointer" onClick={() => onStrengthFilter('all')}>
                {activeStrength}
                <X size={10} />
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                onCategoryFilter(null)
                onTagFilter(null)
                onStrengthFilter('all')
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
