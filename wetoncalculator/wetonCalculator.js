// Function to get Javanese date
//export
function getJavaneseDate(date = new Date()) {
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const pasarans = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];

  const currentDate = date;
  const dayOfWeek = currentDate.getDay(); // Get weekday
  const epochStart = new Date(1633, 1, 8); // Reference date for Javanese epoch
  const diffDays = Math.floor((currentDate - epochStart) / (1000 * 60 * 60 * 24));

  const pasaranIndex = diffDays % 5; // Pasaran cycles every 5 days

  return `${days[dayOfWeek]} ${pasarans[pasaranIndex]}`;
}
