// praytimes-lib.js

//export default
class PrayTimesLib {
  constructor(method = 'ISNA') {
    // Inisialisasi PrayTimes
    this.prayTimes = new PrayTimes(method);
  }

  // Fungsi untuk menyesuaikan waktu dengan menambah atau mengurangi menit
  adjustTime(time, adjustment) {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes + adjustment);

    const adjustedHours = String(date.getHours()).padStart(2, '0');
    const adjustedMinutes = String(date.getMinutes()).padStart(2, '0');
    return `${adjustedHours}:${adjustedMinutes}`;
  }

  // Fungsi untuk menghitung waktu midnight (tengah malam) sebagai titik tengah antara Maghrib dan Fajr
  calculateMidnight(date, coordinates, timezone) {
    // Dapatkan waktu shalat untuk Maghrib dan Fajr
    const times = this.prayTimes.getTimes(date, coordinates, timezone);
    
    const ishaTime = times.isha;
    const nextDayFajrTime = this.prayTimes.getTimes(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), coordinates, timezone).fajr;

    // Konversi waktu Maghrib dan Fajr menjadi menit
    const ishaMinutes = this.timeToMinutes(ishaTime);
    let   fajrMinutes = this.timeToMinutes(nextDayFajrTime);

    // Jika waktu Fajr lebih kecil dari waktu Maghrib, tambahkan 1440 menit (1 hari penuh)
    if (fajrMinutes < ishaMinutes) {
      fajrMinutes += 1440;
    }

    // Hitung titik tengahnya
    const midnightMinutes = Math.floor((ishaMinutes + fajrMinutes) / 2);

    // Jika hasil menit lebih dari 1440, kurangi dengan 1440 untuk mendapatkan waktu di hari berikutnya
    const adjustedMidnightMinutes = midnightMinutes % 1440;

    // Kembalikan waktu midnight dalam format jam dan menit
    return this.minutesToTime(midnightMinutes);
  }

  // Fungsi untuk menghitung waktu Tahajud (2/3 malam)
  calculateTahajud(date, coordinates, timezone) {
    // Dapatkan waktu shalat untuk Maghrib dan Fajr
    const times = this.prayTimes.getTimes(date, coordinates, timezone);

    const ishaTime = times.isha;
    const nextDayFajrTime = this.prayTimes.getTimes(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), coordinates, timezone).fajr;

    // Konversi waktu Maghrib dan Fajr menjadi menit
    const ishaMinutes = this.timeToMinutes(ishaTime);
    let fajrMinutes = this.timeToMinutes(nextDayFajrTime);

    // Jika waktu Fajr lebih kecil dari waktu Maghrib, tambahkan 1440 menit (1 hari penuh)
    if (fajrMinutes < ishaMinutes) {
      fajrMinutes += 1440;
    }

    // Hitung total durasi malam dalam menit
    const totalNightMinutes = fajrMinutes - ishaMinutes;

    // Hitung 2/3 dari malam
    const twoThirdsNight = Math.floor((2 / 3) * totalNightMinutes);

    // Waktu Tahajud adalah 2/3 malam setelah Maghrib
    const tahajudMinutes = ishaMinutes + twoThirdsNight;

    // Kembalikan waktu Tahajud dalam format jam dan menit
    return this.minutesToTime(tahajudMinutes % 1440);  // Gunakan modulus 1440 untuk menyesuaikan waktu ke rentang 24 jam
  }

  // Fungsi untuk menghitung waktu Dhuha (biasanya 15-20 menit setelah Sunrise)
  calculateDhuha(sunriseTime, adjustment = 15) {
    const sunriseMinutes = this.timeToMinutes(sunriseTime);
    const dhuhaMinutes = sunriseMinutes + adjustment;
    return this.minutesToTime(dhuhaMinutes);
  }

  // Fungsi bantu untuk mengkonversi waktu (hh:mm) menjadi menit
  timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Fungsi bantu untuk mengkonversi menit kembali ke format waktu (hh:mm)
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // Fungsi untuk menghitung waktu shalat dan menerapkan penyesuaian
  getPrayerTimesWithAdjustment(date, coordinates, timezone, adjustments = {}) {
    // Dapatkan waktu shalat
    const times = this.prayTimes.getTimes(date, coordinates, timezone);

    // Hitung waktu midnight secara manual
    const midnightTime = this.calculateMidnight(date, coordinates, timezone);
    times.midnight = midnightTime;

    // Hitung waktu tahajud secara manual
    const tahajudTime = this.calculateTahajud(date, coordinates, timezone);
    times.tahajud = tahajudTime;

    // Hitung waktu Dhuha secara manual (15 menit setelah Sunrise sebagai default)
    const dhuhaTime = this.calculateDhuha(times.sunrise, (adjustments.dhuha || 0) + 15);
    times.dhuha = dhuhaTime;

    // Terapkan penyesuaian waktu shalat
    for (let prayer in times) {
      times[prayer] = this.adjustTime(times[prayer], adjustments[prayer] || 0);
    }

    return times;
  }
}
