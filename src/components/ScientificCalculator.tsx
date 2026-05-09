import { useState } from 'react';
import { Calculator, Hash } from 'lucide-react';

const ScientificCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [isScientific, setIsScientific] = useState(false);

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      if (num === '.') setDisplay('0.');
      else setDisplay(num);
    } else {
      if (num === '.' && display.includes('.')) return;
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    const mathOp = op === '×' ? '*' : op === '÷' ? '/' : op === '−' ? '-' : op;
    
    // If we have a number in display, push it to expression with the operator
    if (display !== '0') {
      setExpression(prev => prev + display + ' ' + mathOp + ' ');
      setDisplay('0');
    } else if (expression.length > 0) {
      // If display is 0 but we have an expression, maybe just change the last operator
      const lastChar = expression.trim().slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        setExpression(prev => prev.trim().slice(0, -1) + ' ' + mathOp + ' ');
      } else {
        setExpression(prev => prev + ' ' + mathOp + ' ');
      }
    }
  };

  const handleBracket = (bracket: string) => {
    if (bracket === '(') {
      setExpression(prev => prev + '( ');
    } else {
      // For ')', if there's a number in display, push it first
      const content = display !== '0' ? display : '';
      setExpression(prev => prev + content + ' ) ');
      setDisplay('0');
    }
  };

  const calculate = () => {
    try {
      let finalExpr = expression;
      if (display !== '0') {
        finalExpr += display;
      }
      
      if (!finalExpr.trim()) return;
      
      // Basic sanitization and safety check
      const result = new Function(`return ${finalExpr}`)();
      const formattedResult = Number(result.toFixed(8)).toString();
      
      setDisplay(formattedResult);
      setExpression('');
    } catch (e) {
      console.error(e);
      setDisplay('Error');
      setTimeout(() => setDisplay('0'), 1500);
    }
  };

  const clear = () => {
    setDisplay('0');
    setExpression('');
  };

  const scientificFunc = (func: string) => {
    try {
      const val = parseFloat(display);
      let res = 0;
      switch (func) {
        case 'sin': res = Math.sin(val); break;
        case 'cos': res = Math.cos(val); break;
        case 'tan': res = Math.tan(val); break;
        case 'log': res = Math.log10(val); break;
        case 'ln': res = Math.log(val); break;
        case 'sqrt': res = Math.sqrt(val); break;
        case 'sqr': res = val * val; break;
      }
      setDisplay(Number(res.toFixed(8)).toString());
    } catch (e) {
      setDisplay('Error');
    }
  };

  const standardButtons = [
    { label: 'C', action: clear, color: 'text-red-500' },
    { label: '±', action: () => setDisplay((parseFloat(display) * -1).toString()), color: 'text-brand-500' },
    { label: '%', action: () => setDisplay((parseFloat(display) / 100).toString()), color: 'text-brand-500' },
    { label: '÷', action: () => handleOperator('÷'), color: 'text-brand-500' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('×'), color: 'text-brand-500' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '−', action: () => handleOperator('−'), color: 'text-brand-500' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), color: 'text-brand-500' },
    { label: '0', action: () => handleNumber('0'), colSpan: 2 },
    { label: '.', action: () => handleNumber('.') },
    { label: '=', action: calculate, color: 'bg-brand-600 text-white shadow-xl shadow-brand-200' },
  ];

  const scientificButtons = [
    { label: 'sin', action: () => scientificFunc('sin'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'cos', action: () => scientificFunc('cos'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'tan', action: () => scientificFunc('tan'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'log', action: () => scientificFunc('log'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'C', action: clear, color: 'text-red-500' },

    { label: 'ln', action: () => scientificFunc('ln'), color: 'text-brand-500 bg-brand-50/50' },
    { label: '√', action: () => scientificFunc('sqrt'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'x²', action: () => scientificFunc('sqr'), color: 'text-brand-500 bg-brand-50/50' },
    { label: 'π', action: () => setDisplay(Math.PI.toFixed(8).toString()), color: 'text-brand-500 bg-brand-50/50' },
    { label: '÷', action: () => handleOperator('÷'), color: 'text-brand-500' },

    { label: '(', action: () => handleBracket('('), color: 'text-brand-600' },
    { label: ')', action: () => handleBracket(')'), color: 'text-brand-600' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },

    { label: '±', action: () => setDisplay((parseFloat(display) * -1).toString()), color: 'text-slate-400' },
    { label: '%', action: () => setDisplay((parseFloat(display) / 100).toString()), color: 'text-slate-400' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },

    { label: '×', action: () => handleOperator('×'), color: 'text-brand-500' },
    { label: '−', action: () => handleOperator('−'), color: 'text-brand-500' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },

    { label: '+', action: () => handleOperator('+'), color: 'text-brand-500' },
    { label: '.', action: () => handleNumber('.') },
    { label: '0', action: () => handleNumber('0') },
    { label: '=', action: calculate, color: 'bg-brand-600 text-white shadow-xl col-span-2' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className={`bg-white rounded-[48px] shadow-2xl border border-slate-100 p-8 flex flex-col relative transition-all duration-500 ease-in-out ${
        isScientific ? 'w-full max-w-4xl h-[850px]' : 'w-full max-w-2xl h-[850px]'
      }`}>
         {/* Background Decor */}
         <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-500/5 blur-[120px] pointer-events-none" />

         <div className="flex items-center justify-between mb-8 shrink-0 z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Calculator size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Scientific Calc</h2>
                <p className="text-[10px] font-black text-brand-500 uppercase mt-2 tracking-[0.2em]">High-Precision Engine</p>
              </div>
            </div>
            <button 
              onClick={() => setIsScientific(!isScientific)}
              className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all ${isScientific ? 'bg-brand-600 text-white shadow-xl shadow-brand-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {isScientific ? 'Back to Standard' : 'Scientific Mode'}
            </button>
         </div>

         {/* Display Area */}
         <div className="bg-slate-50 rounded-[40px] p-10 mb-8 flex flex-col items-end justify-center shadow-inner relative border border-slate-100 shrink-0 min-h-[160px]">
            <div className="absolute top-6 left-8 opacity-10 text-brand-600">
               <Hash size={100} />
            </div>
            <div className="text-slate-400 text-xl font-black tracking-widest h-8 mb-2 opacity-60 truncate w-full text-right">
              {expression}
            </div>
            <div className={`font-black text-slate-900 tracking-tighter truncate w-full text-right leading-none ${isScientific ? 'text-7xl' : 'text-8xl'}`}>
              {display}
            </div>
         </div>

         {/* Grid Area */}
         <div className={`flex-1 grid gap-4 transition-all duration-500 ${isScientific ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {(isScientific ? scientificButtons : standardButtons).map((btn: any, i) => (
              <button
                key={i}
                onClick={btn.action}
                className={`
                  ${btn.colSpan === 2 ? 'col-span-2' : 'col-span-1'}
                  flex items-center justify-center rounded-3xl font-black transition-all active:scale-90 shadow-sm
                  ${btn.color || 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-100'}
                  ${isScientific ? 'text-2xl' : 'text-3xl'}
                `}
              >
                {btn.label}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ScientificCalculator;
