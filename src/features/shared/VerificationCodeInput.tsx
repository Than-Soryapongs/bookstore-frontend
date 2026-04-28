import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'

import { Input } from '../../components/ui/input'

type VerificationCodeInputProps = {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

const CODE_LENGTH = 6

function normalizeCode(value: string) {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH)
}

export function VerificationCodeInput({ value, onChange, autoFocus = false, disabled = false, className }: VerificationCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const digits = useMemo(
    () => Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? ''),
    [value],
  )

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  function focusIndex(index: number) {
    inputRefs.current[index]?.focus()
    inputRefs.current[index]?.select()
  }

  function handleChange(index: number, nextValue: string) {
    const nextDigits = normalizeCode(nextValue)

    if (nextDigits.length === 0) {
      const updated = digits.slice()
      updated[index] = ''
      onChange(updated.join(''))
      return
    }

    if (nextDigits.length === 1) {
      const updated = digits.slice()
      updated[index] = nextDigits
      onChange(updated.join('').slice(0, CODE_LENGTH))

      if (index < CODE_LENGTH - 1) {
        focusIndex(index + 1)
      }

      return
    }

    const updated = digits.slice()
    let insertIndex = index

    for (const digit of nextDigits) {
      if (insertIndex >= CODE_LENGTH) {
        break
      }

      updated[insertIndex] = digit
      insertIndex += 1
    }

    onChange(updated.join('').slice(0, CODE_LENGTH))
    const nextFocusIndex = Math.min(insertIndex, CODE_LENGTH - 1)
    focusIndex(nextFocusIndex)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const previousIndex = index - 1
      const updated = digits.slice()
      updated[previousIndex] = ''
      onChange(updated.join(''))
      focusIndex(previousIndex)
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={CODE_LENGTH}
            value={digit}
            disabled={disabled}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className="h-14 w-12 border-white/10 bg-white/6 p-0 text-center text-lg font-semibold tracking-[0.2em] text-white placeholder:text-slate-500 focus-visible:ring-blue-400/40 sm:h-16 sm:w-14 sm:text-xl"
            aria-label={`Verification digit ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default VerificationCodeInput