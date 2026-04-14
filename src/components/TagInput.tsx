'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/components/ui/cn'

const MAX_TAGS = 10

export interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add tag…',
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filteredSuggestions = React.useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && !tags.includes(s))
      .slice(0, 8)
  }, [inputValue, suggestions, tags])

  function addTag(value: string) {
    const trimmed = value.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= MAX_TAGS) return
    onChange([...tags, trimmed])
    setInputValue('')
    setDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex])
      } else {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setHighlightedIndex(-1)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setDropdownOpen(true)
    setHighlightedIndex(-1)
  }

  // Close dropdown on outside click
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const showDropdown = dropdownOpen && filteredSuggestions.length > 0

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input area */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[2.25rem] w-full rounded-lg px-2 py-1.5',
          'bg-navy-900 border border-navy-700/60',
          'cursor-text transition-colors duration-150',
          'focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500/40'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        <AnimatePresence initial={false}>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
                'text-xs font-medium',
                'bg-navy-700/60 text-navy-300 border border-navy-600/40'
              )}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                aria-label={`Remove tag ${tag}`}
                className="rounded-sm text-navy-400 hover:text-foreground transition-colors focus-visible:outline-none"
              >
                <X size={11} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Input */}
        {tags.length < MAX_TAGS && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && setDropdownOpen(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className={cn(
              'flex-1 min-w-[80px] bg-transparent text-sm text-foreground',
              'placeholder:text-muted-foreground outline-none border-none',
              'py-0.5'
            )}
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
        )}

        {/* Limit indicator */}
        {tags.length >= MAX_TAGS && (
          <span className="text-xs text-muted-foreground self-center ml-1">
            Max {MAX_TAGS} tags
          </span>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 mt-1 w-full',
              'rounded-lg border border-navy-700/50',
              'bg-[hsl(240_10%_8%/0.97)] backdrop-blur-xl',
              'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
              'py-1 max-h-48 overflow-y-auto'
            )}
          >
            {filteredSuggestions.map((suggestion, i) => (
              <li
                key={suggestion}
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseDown={(e) => { e.preventDefault(); addTag(suggestion) }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer select-none',
                  'transition-colors duration-100',
                  i === highlightedIndex
                    ? 'bg-navy-700/50 text-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                {suggestion}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
