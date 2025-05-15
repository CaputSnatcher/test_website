document.addEventListener('DOMContentLoaded', function() {
  const countrySelect = document.getElementById('country');
  const citySelect = document.getElementById('city');

  if (countrySelect && citySelect) {
    // Загрузка списка стран при открытии страницы
    loadCountries();

    // Обработка изменения выбранной страны
    countrySelect.addEventListener('change', function() {
      const selectedCountry = this.value;
      if (selectedCountry) {
        loadCities(selectedCountry);
      } else {
        resetCitySelect();
      }
    });
  }

  async function loadCountries() {
    try {
      const response = await fetch('/api/cities');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const countriesData = await response.json();
      populateCountrySelect(Object.keys(countriesData));
    } catch (error) {
      console.error('Failed to load countries:', error);
      alert('Ошибка загрузки списка стран');
    }
  }

  async function loadCities(country) {
    try {
      citySelect.disabled = true;
      citySelect.innerHTML = '<option value="">Загрузка...</option>';
      
      const response = await fetch(`/api/cities?country=${encodeURIComponent(country)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const cities = await response.json();
      populateCitySelect(cities);
    } catch (error) {
      console.error(`Failed to load cities for ${country}:`, error);
      alert('Ошибка загрузки списка городов');
      resetCitySelect();
    }
  }

  function populateCountrySelect(countries) {
    countrySelect.innerHTML = '<option value="">Выберите страну</option>' +
      countries.map(country => 
        `<option value="${country}">${country}</option>`
      ).join('');
  }

  function populateCitySelect(cities) {
    citySelect.innerHTML = '<option value="">Выберите город</option>' +
      cities.map(city => 
        `<option value="${city}">${city}</option>`
      ).join('');
    citySelect.disabled = false;
  }

  function resetCitySelect() {
    citySelect.innerHTML = '<option value="">Сначала выберите страну</option>';
    citySelect.disabled = true;
  }
});