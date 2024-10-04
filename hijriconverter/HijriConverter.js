//export default
class HijriConverter {
    constructor() {
        this.offsetDays = 0; // Default offset hari
        this.cutoffHour = 18; // Default cutoff waktu (18:00)
        this.cutoffMinute = 0; // Default cutoff menit
        this.months = ["Muharram","Safar","Rabiul Awwal","Rabiul Tsani","Jumadil Ula","Jumadil Tsani","Rajab","Sya'ban","Ramadhan","Syawwal","Dzul Qa'dah","Dzul Hijjah"];
        this.weekdays = ["Ahad","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
        this.gregorianMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    }

    setOffsetDays(offsetDays) {
        this.offsetDays = offsetDays; // Penyesuaian hari (+1 atau +2)
    }

    setCutoffTime(hour, minute) {
        this.cutoffHour = hour;
        this.cutoffMinute = minute;
    }

    isGregLeapYear(year) {
        return year % 4 == 0 && year % 100 != 0 || year % 400 == 0;
    }

    gregToFixed(year, month, day) {
        let a = Math.floor((year - 1) / 4);
        let b = Math.floor((year - 1) / 100);
        let c = Math.floor((year - 1) / 400);
        let d = Math.floor((367 * month - 362) / 12);
        let e = 0;

        if (month > 2 && this.isGregLeapYear(year)) {
            e = -1;
        } else if (month > 2) {
            e = -2;
        }

        return 1 - 1 + 365 * (year - 1) + a - b + c + d + e + day;
    }

    hijriToFixed(year, month, day) {
        return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 +
            Math.floor((3 + 11 * year) / 30) + 227015 - 1;
    }

    fixedToHijri(fixedDate) {
        let hijriYear = Math.floor((30 * (fixedDate - 227015) + 10646) / 10631);
        let hijriMonth = Math.ceil((fixedDate - 29 - this.hijriToFixed(hijriYear, 1, 1)) / 29.5) + 1;
        hijriMonth = Math.min(hijriMonth, 12);
        let hijriDay = fixedDate - this.hijriToFixed(hijriYear, hijriMonth, 1) + 1;

        return {
            year: hijriYear,
            month: hijriMonth,
            day: hijriDay
        };
    }

    getHijri(date = new Date()) {
        const y = date.getFullYear();
        const m = date.getMonth() + 1; // Bulan pada JavaScript 0-based
        const d = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        
        // Cek apakah sudah melewati waktu cutoff (Maghrib)
        if (hours > this.cutoffHour || (hours === this.cutoffHour && minutes >= this.cutoffMinute)) {
            date.setDate(d + 1); // Geser tanggal ke hari berikutnya di Hijriah
        }

        let fixedDate = this.gregToFixed(y, m, d);
        fixedDate += this.offsetDays; // Penyesuaian hari (+1 atau +2 jika diperlukan)
        return this.fixedToHijri(fixedDate);
    }

    hijriToString(hijriDate) {
        return `${hijriDate.day} ${this.months[hijriDate.month - 1]} ${hijriDate.year}`;
    }

    getFullHijriString(date = new Date()) {
        const hijriDate = this.getHijri(date);
        const dayName = this.weekdays[date.getDay()];
        const dateString = `${dayName}, ${hijriDate.day} ${this.months[hijriDate.month - 1]} ${hijriDate.year}`;
        return dateString;
    }

    // Fungsi untuk mendapatkan nama bulan dalam gregorian jika diperlukan
    getGregorianString(date = new Date()) {
        const dayName = this.weekdays[date.getDay()];
        const monthName = this.gregorianMonths[date.getMonth()];
        return `${date.getDate()} ${monthName} ${date.getFullYear()}`;
    }

    // Fungsi untuk mendapatkan nama hari dan bulan dalam gregorian jika diperlukan
    getFullGregorianString(date = new Date()) {
        const dayName = this.weekdays[date.getDay()];
        const monthName = this.gregorianMonths[date.getMonth()];
        return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
    }

}
