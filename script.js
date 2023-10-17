document.getElementById('convert').addEventListener('click', function() {
    const input = document.getElementById('upload');
    const file = input.files[0];
    
    if (!file) {
        alert('Bitte wählen Sie eine CSV-Datei aus.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
        let dailyStarts = {};
        let dailyEnds = {};
        let dailyEvents = {};

        const parseCSVRow = (row) => {
            const regex = /"([^"]+)"|([^,]+)/g;
            let matches = [];
            let match;
            while ((match = regex.exec(row)) !== null) {
                matches.push(match[1] || match[2]);
            }
            return matches;
        };

        for (let i = 1; i < rows.length; i++) {
            const row = parseCSVRow(rows[i]);
            if (row.length < 12) continue;
            
            const date = row[7];
            const startTime = row[8].substring(0, 5); // Format HH:MM
            const endTime = row[10].substring(0, 5); // Format HH:MM
            
            // Speichern der Startzeit des ersten Termins und der Endzeit des letzten Termins des Tages
            if (!dailyStarts[date] || dailyStarts[date] > startTime) {
                dailyStarts[date] = startTime;
            }
            if (!dailyEnds[date] || dailyEnds[date] < endTime) {
                dailyEnds[date] = endTime;
            }
            
            // Speichern der Ereignisse pro Tag
            if (!dailyEvents[date]) dailyEvents[date] = [];
            dailyEvents[date].push({ start: startTime, end: endTime, summary: row[3], location: row[5] });
        }
        
for (const [date, events] of Object.entries(dailyEvents)) {
            events.sort((a, b) => a.start.localeCompare(b.start)); // Sortieren der Ereignisse nach Startzeit
            
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const startDate = date + 'T' + event.start.replace(/:/g, '') + '00';
                const endDate = date + 'T' + event.end.replace(/:/g, '') + '00';
                
                icsContent += 'BEGIN:VEVENT\n';
                icsContent += 'SUMMARY:' + event.summary + '\n';
                icsContent += 'LOCATION:' + event.location + '\n';
                icsContent += 'DTSTART:' + startDate + '\n';
                icsContent += 'DTEND:' + endDate + '\n';
                icsContent += 'END:VEVENT\n';
                
                // Überprüfen, ob eine Pause zwischen dem aktuellen und dem nächsten Ereignis besteht
                if (i < events.length - 1) {
                    const nextEvent = events[i + 1];
                    const pauseStart = event.end;
                    const pauseEnd = nextEvent.start;
                    
                    if (pauseStart < pauseEnd) {
                        const pauseStartDate = date + 'T' + pauseStart.replace(/:/g, '') + '00';
                        const pauseEndDate = date + 'T' + pauseEnd.replace(/:/g, '') + '00';
                        
                        // Berechnen der Dauer der Pause in Stunden und Minuten
                        const pauseStartMinutes = parseInt(pauseStart.split(':')[0]) * 60 + parseInt(pauseStart.split(':')[1]);
                        const pauseEndMinutes = parseInt(pauseEnd.split(':')[0]) * 60 + parseInt(pauseEnd.split(':')[1]);
                        const pauseDurationMinutes = pauseEndMinutes - pauseStartMinutes;
                        const pauseHours = Math.floor(pauseDurationMinutes / 60);
                        const pauseMinutes = pauseDurationMinutes % 60;
                        const pauseDuration = (pauseHours > 0 ? pauseHours + ':' : '') + (pauseMinutes < 10 ? '0' : '') + pauseMinutes;
                        
                        icsContent += 'BEGIN:VEVENT\n';
                        icsContent += 'SUMMARY:Pause ' + pauseDuration + ' Uhr\n';
                        icsContent += 'DTSTART:' + pauseStartDate + '\n';
                        icsContent += 'DTEND:' + pauseEndDate + '\n';
                        icsContent += 'END:VEVENT\n';
                    }
                }
            }
        }
        
        // Erstellen der zusätzlichen 30-minütigen Termine um 04:00 Uhr und 21:00 Uhr
        for (const [date, startTime] of Object.entries(dailyStarts)) {
            const morningSummary = 'Begin ' + startTime + ' Uhr';
            const morningStartDate = date + 'T040000';
            const morningEndDate = date + 'T043000';
            
            icsContent += 'BEGIN:VEVENT\n';
            icsContent += 'SUMMARY:' + morningSummary + '\n';
            icsContent += 'DTSTART:' + morningStartDate + '\n';
            icsContent += 'DTEND:' + morningEndDate + '\n';
            icsContent += 'END:VEVENT\n';
            
            const eveningSummary = 'Feierabend ' + dailyEnds[date] + ' Uhr';
            const eveningStartDate = date + 'T210000';
            const eveningEndDate = date + 'T213000';
            
            icsContent += 'BEGIN:VEVENT\n';
            icsContent += 'SUMMARY:' + eveningSummary + '\n';
            icsContent += 'DTSTART:' + eveningStartDate + '\n';
            icsContent += 'DTEND:' + eveningEndDate + '\n';
            icsContent += 'END:VEVENT\n';
        }
        
        icsContent += 'END:VCALENDAR';
        
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const link = document.getElementById('download');
        link.href = URL.createObjectURL(blob);
        link.download = 'events.ics';
        link.style.display = 'block';
    };
    
    reader.readAsText(file);
});