
import { motion } from 'framer-motion';
import type { Card as CardType } from '@pruno/shared';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    disabled?: boolean;
}

const colorStyles: Record<string, { bg: string; shadow: string }> = {
    red: { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: '0 10px 40px rgba(239, 68, 68, 0.4)' },
    blue: { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', shadow: '0 10px 40px rgba(59, 130, 246, 0.4)' },
    green: { bg: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', shadow: '0 10px 40px rgba(34, 197, 94, 0.4)' },
    yellow: { bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', shadow: '0 10px 40px rgba(234, 179, 8, 0.4)' },
    wild: { bg: 'linear-gradient(135deg, #ef4444 0%, #eab308 33%, #22c55e 66%, #3b82f6 100%)', shadow: '0 10px 40px rgba(168, 85, 247, 0.4)' },
};

const formatValue = (val: string): string => {
    switch (val) {
        case 'skip': return '⊘';
        case 'reverse': return '⟲';
        case 'draw_two': return '+2';
        case 'wild': return 'W';
        case 'wild_draw_four': return '+4';
        default: return val;
    }
};

export const Card = ({ card, onClick, disabled }: CardProps) => {
    const style = colorStyles[card.color] || colorStyles.wild;
    const displayValue = formatValue(card.value);
    const isSpecial = ['skip', 'reverse', 'draw_two', 'wild', 'wild_draw_four'].includes(card.value);

    return (
        <motion.div
            layout
            whileHover={!disabled ? { y: -25, scale: 1.15, zIndex: 50 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={!disabled ? onClick : undefined}
            style={{
                background: style.bg,
                boxShadow: style.shadow,
            }}
            className={`relative w-24 h-36 rounded-2xl flex items-center justify-center cursor-pointer border-4 border-white/80 select-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed grayscale-[30%]' : 'hover:border-yellow-300'}`}
        >
            {/* Inner oval */}
            <div className="absolute inset-2 bg-white/95 rounded-[40%] flex items-center justify-center rotate-[15deg]">
                <span
                    className={`font-black text-transparent bg-clip-text drop-shadow-sm ${isSpecial ? 'text-4xl' : 'text-5xl'}`}
                    style={{
                        backgroundImage: style.bg,
                        WebkitBackgroundClip: 'text',
                    }}
                >
                    {displayValue}
                </span>
            </div>

            {/* Top-left corner value */}
            <div className="absolute top-2 left-2 text-white font-black text-lg drop-shadow-md">
                {displayValue}
            </div>

            {/* Bottom-right corner value (rotated) */}
            <div className="absolute bottom-2 right-2 text-white font-black text-lg drop-shadow-md rotate-180">
                {displayValue}
            </div>
        </motion.div>
    );
};
