import React, { useState, useEffect, MouseEvent } from 'react';
import { Calendar, Clock, Plus, Minus, ChevronLeft, ChevronRight, Trash2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface DayEntry {
  date: string;
  hours: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

function App() {
  const [entries, setEntries] = useState<DayEntry[]>(() => {
    const saved = localStorage.getItem('codingHours2025');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    return today >= startDate ? today.toISOString().split('T')[0] : '2025-01-01';
  });
  const [hours, setHours] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    localStorage.setItem('codingHours2025', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const totalHours = entries.reduce((sum: number, entry: DayEntry) => sum + entry.hours, 0);

  const monthlyHours = entries.reduce((acc: Record<number, number>, entry: DayEntry) => {
    const month = new Date(entry.date).getMonth();
    acc[month] = (acc[month] || 0) + entry.hours;
    return acc;
  }, {} as Record<number, number>);

  const isValidDate = (date: Date): boolean => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const dateToCheck = new Date(date);
    dateToCheck.setUTCHours(12, 0, 0, 0);
    
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    
    const startDate = new Date('2025-01-01T12:00:00.000Z');
    const endDate = new Date('2025-12-31T23:59:59.999Z');
    
    return dateToCheck >= startDate && dateToCheck <= endDate && dateToCheck <= today;
  };

  const validateAndClampHours = (hours: number): number => {
    return Math.min(Math.max(0, Math.round(hours * 2) / 2), 24);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(hours);
    
    if (isNaN(hoursNum)) {
      setError('Please enter a valid number of hours');
      return;
    }

    const validatedHours = validateAndClampHours(hoursNum);
    if (validatedHours === 0 && hoursNum !== 0) {
      setError('Hours must be between 0 and 24');
      return;
    }

    const selectedDateObj = new Date(selectedDate + 'T00:00:00.000Z');
    
    if (!isValidDate(selectedDateObj)) {
      setError('Cannot add hours for future dates or dates outside 2025');
      return;
    }

    try {
      const existingEntryIndex = entries.findIndex(entry => entry.date === selectedDate);
      if (existingEntryIndex !== -1) {
        const newEntries = [...entries];
        newEntries[existingEntryIndex].hours = validatedHours;
        setEntries(newEntries);
      } else {
        setEntries([...entries, { date: selectedDate, hours: validatedHours }]);
      }
      setHours('');
      setAlert({
        message: `Logged ${validatedHours} hours for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        type: 'success'
      });
    } catch (err) {
      setError('Failed to save entry. Please try again.');
    }
  };

  const deleteEntry = (date: string, hoursToDelete?: number) => {
    try {
      const existingEntry = entries.find(entry => entry.date === date);
      if (!existingEntry) return;

      if (hoursToDelete && hoursToDelete < existingEntry.hours) {
        // Partial deletion
        const newEntries = entries.map(entry => {
          if (entry.date === date) {
            return { ...entry, hours: entry.hours - hoursToDelete };
          }
          return entry;
        });
        setEntries(newEntries);
        setAlert({
          message: `Removed ${hoursToDelete} hours from ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          type: 'success'
        });
      } else {
        // Full deletion
        setEntries(entries.filter(entry => entry.date !== date));
        setAlert({
          message: `Removed all hours for ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          type: 'success'
        });
      }
    } catch (err) {
      setError('Failed to delete entry. Please try again.');
    }
  };

  const quickAdd = (amount: number) => {
    const today = new Date();
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    
    if (today < startDate) {
      setError('Cannot add hours before 2025');
      return;
    }
    
    try {
      const todayStr = today.toISOString().split('T')[0];
      const currentHours = entries.find((entry: DayEntry) => entry.date === todayStr)?.hours || 0;
      const newHours = validateAndClampHours(currentHours + amount);

      if (newHours === currentHours) {
        if (amount > 0) {
          setError('Cannot exceed 24 hours in a day');
        } else if (amount < 0) {
          setError('Hours cannot be negative');
        }
        return;
      }

      const existingEntryIndex = entries.findIndex(entry => entry.date === todayStr);
      if (existingEntryIndex !== -1) {
        const newEntries = [...entries];
        newEntries[existingEntryIndex].hours = newHours;
        setEntries(newEntries);
      } else {
        setEntries([...entries, { date: todayStr, hours: newHours }]);
      }
    } catch (err) {
      setError('Failed to save entry. Please try again.');
    }
  };

  const quickAddForDate = (date: string, hours: number) => {
    const selectedDate = new Date(date);
    selectedDate.setUTCHours(12, 0, 0, 0);
    
    if (!isValidDate(selectedDate)) {
      setError('Cannot add hours for future dates or dates outside 2025');
      return;
    }

    try {
      const dateStr = formatDate(selectedDate);
      const currentHours = entries.find((entry: DayEntry) => entry.date === dateStr)?.hours || 0;
      const newHours = validateAndClampHours(currentHours + hours);

      if (newHours === currentHours) {
        if (hours > 0) {
          setError('Cannot exceed 24 hours in a day');
        } else if (hours < 0) {
          setError('Hours cannot be negative');
        }
        return;
      }

      const existingEntryIndex = entries.findIndex(entry => entry.date === dateStr);
      if (existingEntryIndex !== -1) {
        const newEntries = [...entries];
        newEntries[existingEntryIndex].hours = newHours;
        setEntries(newEntries);
      } else {
        setEntries([...entries, { date: dateStr, hours: newHours }]);
      }
    } catch (err) {
      setError('Failed to save entry. Please try again.');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(Date.UTC(year, month, 1, 12));
    const lastDay = new Date(Date.UTC(year, month + 1, 0, 12));
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const previousMonth = new Date(Date.UTC(year, month, 0, 12));
    const daysInPreviousMonth = previousMonth.getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(Date.UTC(year, month - 1, daysInPreviousMonth - i, 12)),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(Date.UTC(year, month, i, 12)),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(Date.UTC(year, month + 1, i, 12)),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prevMonth: Date) => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(prevMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(prevMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    d.setUTCHours(12, 0, 0, 0);
    return d.toISOString().split('T')[0];
  };

  const getHoursForDate = (date: string) => {
    return entries.find((entry: DayEntry) => entry.date === date)?.hours || 0;
  };

  const handleQuickHourSelect = (dateStr: string, hours: number) => {
    const date = new Date(dateStr);
    date.setUTCHours(12, 0, 0, 0);
    quickAddForDate(formatDate(date), hours);
  };

  const getPastDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const endDate = new Date('2025-12-31T23:59:59.999Z');
    
    // If we're before 2025, show all available dates up to today
    const currentDate = new Date(startDate);
    const endDateToUse = today > endDate ? endDate : today;

    while (currentDate <= endDateToUse) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates.reverse();
  };

  const validateDateRange = (start: string, end: string): boolean => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const maxRangeDays = 365; // Maximum range of one year
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= maxRangeDays;
  };

  const getHoursBetweenDates = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    try {
      if (!validateDateRange(start, end)) {
        setError('Date range cannot exceed one year');
        return 0;
      }
      
      return entries
        .filter((entry: DayEntry) => entry.date >= start && entry.date <= end)
        .reduce((sum: number, entry: DayEntry) => sum + entry.hours, 0);
    } catch (err) {
      setError('Error calculating hours between dates');
      return 0;
    }
  };

  // Add a new component for the exportable image
  const ExportableCalendar = React.forwardRef<HTMLDivElement>((_, ref) => (
    <div 
      ref={ref} 
      className="bg-zinc-900 p-8 rounded-2xl"
      style={{ fontFamily: 'inherit', width: '800px' }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl text-green-400 font-semibold">
            2025 Did You Code?
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-800 px-6 py-3 rounded-lg border border-green-500/20">
              <Clock className="w-6 h-6 text-green-400" />
              <div className="flex flex-col items-end">
                <div className="text-sm text-green-400/70">This Month</div>
                <div className="text-2xl text-green-400">{getCurrentMonthHours()}h</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-800 px-6 py-3 rounded-lg border border-green-500/20">
              <Clock className="w-6 h-6 text-green-400" />
              <div className="flex flex-col items-end">
                <div className="text-sm text-green-400/70">This Year</div>
                <div className="text-2xl text-green-400">{totalHours}h</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800 p-6 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl text-green-400">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-green-400/60 text-sm">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth(currentMonth).map(({ date, isCurrentMonth }, index) => {
              const dateStr = formatDate(date);
              const hours = getHoursForDate(dateStr);
              const today = new Date();
              today.setUTCHours(0, 0, 0, 0);
              const dateToCompare = new Date(date);
              dateToCompare.setUTCHours(0, 0, 0, 0);
              const isToday = dateToCompare.getTime() === today.getTime();

              return (
                <div
                  key={index}
                  className={`
                    aspect-square p-1 rounded-lg border
                    ${isCurrentMonth ? 'border-green-500/20 bg-zinc-800/50' : 'border-transparent bg-transparent'}
                    ${isToday ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-800' : ''}
                  `}
                >
                  <div className="text-center">
                    <span className={`text-sm ${isCurrentMonth ? 'text-green-400' : 'text-green-400/30'}`}>
                      {date.getDate()}
                    </span>
                    {isCurrentMonth && hours > 0 && (
                      <div className="text-xs text-green-400 mt-1">
                        {hours}h
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  ));

  // Update the export and share functions
  const exportAndShare = async () => {
    try {
      const exportRef = document.getElementById('exportable-calendar');
      if (!exportRef) {
        setError('Could not find calendar element to export');
        return;
      }

      // Create the PNG with proper dimensions
      const dataUrl = await toPng(exportRef, {
        quality: 1.0,
        backgroundColor: '#18181B',
        width: 800,
        height: 800,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '800px'
        },
        pixelRatio: 2
      });

      // Download the PNG first
      downloadImage(dataUrl);

      // Prepare tweet text
      const tweetText = `I've coded ${totalHours} hours in 2025! 💻✨\nThis month: ${getCurrentMonthHours()} hours\n#CodingJourney #Code2025`;
      
      // Open Twitter in a new browser window
      window.location.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

      setAlert({
        message: 'PNG downloaded! You can now attach it to your tweet.',
        type: 'success'
      });
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export image. Please try again.');
    }
  };

  // Update the save PNG function with better error handling
  const savePNG = async () => {
    try {
      const exportRef = document.getElementById('exportable-calendar');
      if (!exportRef) {
        setError('Could not find calendar element to export');
        return;
      }

      // Validate current state before export
      if (totalHours === 0) {
        setError('No hours logged yet to export');
        return;
      }

      const dataUrl = await toPng(exportRef, {
        quality: 1.0,
        backgroundColor: '#18181B',
        width: 800,
        height: 800,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '800px'
        },
        pixelRatio: 2
      }).catch(err => {
        console.error('PNG generation failed:', err);
        throw new Error('Failed to generate PNG');
      });

      downloadImage(dataUrl);
    } catch (err) {
      console.error('Save PNG failed:', err);
      setError('Failed to save image. Please try again.');
    }
  };

  // Add helper function for current month hours
  const getCurrentMonthHours = (): number => {
    const displayedMonth = currentMonth.getMonth();
    return entries.reduce((sum, entry) => {
      const entryMonth = new Date(entry.date).getMonth();
      return entryMonth === displayedMonth ? sum + entry.hours : sum;
    }, 0);
  };

  // Update the downloadImage function with better error handling
  const downloadImage = (dataUrl: string) => {
    try {
      const link = document.createElement('a');
      link.download = `coding-hours-2025-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      setAlert({
        message: 'Image downloaded successfully!',
        type: 'success'
      });
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download image. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black p-2 sm:p-4 md:p-6">
      {/* Hidden exportable calendar */}
      <div className="hidden">
        <ExportableCalendar ref={(ref) => ref && (ref.id = 'exportable-calendar')} />
      </div>
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* First Box: Header and Calendar */}
        <div className="bg-zinc-900 rounded-2xl shadow-[0_0_15px_rgba(74,222,128,0.2)] p-3 sm:p-6 md:p-8 border border-green-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-green-400 text-center sm:text-left font-semibold">
              2025 Did You Code?
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-green-500/20">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                <div className="flex flex-col items-end">
                  <div className="text-sm text-green-400/70">This Month</div>
                  <div className="text-xl sm:text-2xl text-green-400">{getCurrentMonthHours()}h</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-green-500/20">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                <div className="flex flex-col items-end">
                  <div className="text-sm text-green-400/70">This Year</div>
                  <div className="text-xl sm:text-2xl text-green-400">{totalHours}h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div id="calendar-section" className="mb-6 bg-zinc-800 p-3 sm:p-6 rounded-xl border border-green-500/20 overflow-x-auto">
            <div className="min-w-[300px] sm:min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <button 
                  onClick={() => navigateMonth('prev')}
                  className="p-1.5 sm:p-2 text-green-400 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <h2 className="text-lg sm:text-xl md:text-2xl text-green-400">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <button 
                  onClick={() => navigateMonth('next')}
                  className="p-1.5 sm:p-2 text-green-400 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-green-400/60 text-xs sm:text-sm">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {getDaysInMonth(currentMonth).map(({ date, isCurrentMonth }, index) => {
                  const dateStr = formatDate(date);
                  const hours = getHoursForDate(dateStr);
                  const today = new Date();
                  today.setUTCHours(0, 0, 0, 0);
                  const dateToCompare = new Date(date);
                  dateToCompare.setUTCHours(0, 0, 0, 0);
                  const isToday = dateToCompare.getTime() === today.getTime();
                  const isPast = isValidDate(dateToCompare);

                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square p-0.5 sm:p-1 rounded-lg border relative group
                        ${isCurrentMonth 
                          ? 'border-green-500/20 bg-zinc-800/50 hover:bg-zinc-700/50' 
                          : 'border-transparent bg-transparent'}
                        ${isToday ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-800' : ''}
                        ${!isPast ? 'opacity-50 cursor-not-allowed' : isPast && isCurrentMonth ? 'cursor-pointer' : ''}
                        ${dateRange.start === dateStr ? 'bg-green-500/20 border-green-500' : ''}
                        ${dateRange.end === dateStr ? 'bg-green-500/20 border-green-500' : ''}
                        ${dateRange.start && dateRange.end && dateStr > dateRange.start && dateStr < dateRange.end ? 'bg-green-500/10' : ''}
                      `}
                      onClick={() => {
                        if (isPast && isCurrentMonth) {
                          const clickedDate = formatDate(date);
                          if (!dateRange.start) {
                            setDateRange({ start: clickedDate, end: null });
                          } else if (!dateRange.end) {
                            const start = dateRange.start;
                            const end = clickedDate;
                            
                            // Ensure dates are in correct order
                            const [startDate, endDate] = start > end ? [end, start] : [start, end];
                            
                            if (!validateDateRange(startDate, endDate)) {
                              setError('Date range cannot exceed one year');
                              setDateRange({ start: null, end: null });
                              return;
                            }
                            
                            setDateRange({ start: startDate, end: endDate });
                            const hours = getHoursBetweenDates(startDate, endDate);
                            
                            if (hours > 0) {
                              setAlert({
                                message: `You coded ${hours} hours between ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} and ${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
                                type: 'info'
                              });
                            } else {
                              setAlert({
                                message: 'No hours logged for the selected date range',
                                type: 'info'
                              });
                            }
                          } else {
                            setDateRange({ start: clickedDate, end: null });
                          }
                          setSelectedDate(clickedDate);
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      <div className="text-center">
                        <span className={`text-xs sm:text-sm ${isCurrentMonth ? 'text-green-400' : 'text-green-400/30'}`}>
                          {date.getDate()}
                        </span>
                        {isCurrentMonth && hours > 0 && (
                          <div className="text-[10px] sm:text-xs text-green-400 mt-0.5 sm:mt-1">
                            {hours}h
                          </div>
                        )}
                      </div>
                      {isPast && isCurrentMonth && (
                        <div className="absolute inset-0 hidden group-hover:flex flex-col gap-1 bg-zinc-800/95 items-center justify-center">
                          {[1, 2, 4, 6, 8].map(h => (
                            <button
                              key={h}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickHourSelect(dateStr, h);
                              }}
                              className="text-xs bg-zinc-700 text-green-400 px-2 py-1 rounded hover:bg-zinc-600 transition-colors w-12"
                            >
                              +{h}h
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export/Share Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={savePNG}
              className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Save as PNG
            </button>
            <button
              onClick={exportAndShare}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share on Twitter
            </button>
          </div>
        </div>

        {/* Second Box: Quick Add and Manual Entry */}
        <div className="bg-zinc-900 rounded-2xl shadow-[0_0_15px_rgba(74,222,128,0.2)] p-3 sm:p-6 md:p-8 border border-green-500/20">
          <div className="space-y-6">
            {/* Quick Add Hours Section */}
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-xl border border-green-500/20">
              <h3 className="text-lg sm:text-xl text-green-400 mb-4 sm:mb-6 font-medium">Quick Add Hours</h3>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-zinc-700/50 p-2 rounded-lg">
                  <button
                    onClick={() => quickAdd(-0.5)}
                    className="p-2 bg-zinc-700 text-green-400 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-sm text-green-400/70">Today's Hours</div>
                    <div className="text-2xl text-green-400">
                      {entries.find(entry => entry.date === new Date().toISOString().split('T')[0])?.hours || 0}h
                    </div>
                  </div>
                  <button
                    onClick={() => quickAdd(0.5)}
                    className="p-2 bg-zinc-700 text-green-400 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  {[1, 2, 4, 8].map(hours => (
                    <button
                      key={hours}
                      onClick={() => quickAdd(hours)}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      +{hours}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-xl border border-green-500/20">
              <h3 className="text-lg sm:text-xl text-green-400 mb-4 sm:mb-6">Manual Entry</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="w-full px-4 py-2 bg-zinc-700 text-green-400 rounded-lg hover:bg-zinc-600 transition-colors text-left"
                  >
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </button>
                  {showDatePicker && (
                    <div 
                      className="fixed inset-0 bg-black/50 z-10"
                      onClick={() => setShowDatePicker(false)}
                    >
                      <div 
                        className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto bg-zinc-800 rounded-lg border border-green-500/20 shadow-lg"
                        onClick={e => e.stopPropagation()}
                      >
                        {getPastDates().map(date => (
                          <button
                            key={date.toISOString()}
                            onClick={() => {
                              setSelectedDate(formatDate(date));
                              setShowDatePicker(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-zinc-700 transition-colors ${
                              formatDate(date) === selectedDate 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'text-green-400'
                            }`}
                          >
                            {date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(hour => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => setHours(hour.toString())}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        hours === hour.toString()
                          ? 'bg-green-500 text-black'
                          : 'bg-zinc-700 text-green-400 hover:bg-zinc-600'
                      } transition-colors`}
                    >
                      {hour}h
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-black px-6 py-2 rounded-lg hover:bg-green-500 transition-colors text-xl"
                  >
                    Log Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentHours = getHoursForDate(selectedDate);
                      const selectedHours = parseFloat(hours);
                      if (currentHours > 0 && !isNaN(selectedHours)) {
                        deleteEntry(selectedDate, selectedHours);
                        setHours('');
                      }
                    }}
                    className={`px-6 py-2 ${
                      getHoursForDate(selectedDate) > 0 
                        ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                        : 'bg-zinc-600/20 text-zinc-400 cursor-not-allowed'
                    } rounded-lg transition-colors`}
                    disabled={getHoursForDate(selectedDate) === 0}
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Third Box: Recent Entries and Date Range */}
        <div className="bg-zinc-900 rounded-2xl shadow-[0_0_15px_rgba(74,222,128,0.2)] p-3 sm:p-6 md:p-8 border border-green-500/20">
          <div className="space-y-6">
            {/* Recent Entries Section */}
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-xl border border-green-500/20">
              <h3 className="text-lg sm:text-xl text-green-400 mb-4 sm:mb-6">Recent Entries</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {entries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((entry) => (
                    <div
                      key={entry.date}
                      className="flex items-center justify-between p-3 bg-zinc-700/50 rounded-lg border border-green-500/20"
                    >
                      <span className="text-green-400">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl text-green-400">
                          {entry.hours}h
                        </span>
                        <button
                          onClick={() => deleteEntry(entry.date)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Date Range Stats Section */}
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-xl border border-green-500/20">
              <h3 className="text-lg sm:text-xl text-green-400 mb-4 sm:mb-6 font-medium">Date Range Stats</h3>
              <div className="text-green-400/70 text-sm mb-2">
                {dateRange.start && dateRange.end 
                  ? `Selected: ${new Date(dateRange.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(dateRange.end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                  : 'Click two dates on the calendar to see total hours between them'}
              </div>
              {dateRange.start && dateRange.end && (
                <div className="flex items-center justify-between bg-zinc-700/50 p-3 rounded-lg">
                  <span>Total Hours:</span>
                  <span className="text-2xl text-green-400">{getHoursBetweenDates(dateRange.start, dateRange.end)}h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {(error || alert) && (
        <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
          {error && (
            <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
              {error}
            </div>
          )}
          {alert && (
            <div 
              className={`${
                alert.type === 'success' ? 'bg-green-500/90' : 'bg-blue-500/90'
              } text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between gap-4`}
            >
              <span>{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;