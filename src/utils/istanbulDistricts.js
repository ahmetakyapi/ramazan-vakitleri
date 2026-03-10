export const ISTANBUL_CITY_ID = '539';
export const ISTANBUL_PRAYER_ZONE_ID = '9541';

const MISSING_ISTANBUL_DISTRICTS = [
  'ADALAR',
  'ATAŞEHİR',
  'BAĞCILAR',
  'BAHÇELİEVLER',
  'BAKIRKÖY',
  'BAYRAMPAŞA',
  'BEŞİKTAŞ',
  'BEYKOZ',
  'BEYOĞLU',
  'ESENLER',
  'EYÜPSULTAN',
  'FATİH',
  'GAZİOSMANPAŞA',
  'GÜNGÖREN',
  'KADIKÖY',
  'KAĞITHANE',
  'SARIYER',
  'ŞİŞLİ',
  'ÜMRANİYE',
  'ÜSKÜDAR',
  'ZEYTİNBURNU',
];

const TURKISH_CHAR_MAP = {
  Ç: 'C',
  Ğ: 'G',
  İ: 'I',
  Ö: 'O',
  Ş: 'S',
  Ü: 'U',
};

const normalizeDistrictName = (name = '') => name.toLocaleUpperCase('tr-TR');

const missingDistrictSet = new Set(
  MISSING_ISTANBUL_DISTRICTS.map(normalizeDistrictName)
);

const toAsciiUpper = (name) =>
  normalizeDistrictName(name)
    .split('')
    .map((char) => TURKISH_CHAR_MAP[char] || char)
    .join('');

const sortDistricts = (districts) =>
  [...districts].sort((a, b) => a.IlceAdi.localeCompare(b.IlceAdi, 'tr-TR'));

const createVirtualIstanbulDistrict = (name) => {
  const asciiName = toAsciiUpper(name);

  return {
    IlceID: `virtual-istanbul-${asciiName.toLowerCase()}`,
    IlceAdi: normalizeDistrictName(name),
    IlceAdiEn: asciiName,
    sourceIlceID: ISTANBUL_PRAYER_ZONE_ID,
    _virtual: true,
  };
};

export const augmentDistricts = (cityId, districts) => {
  if (!Array.isArray(districts)) {
    return [];
  }

  if (cityId !== ISTANBUL_CITY_ID) {
    return sortDistricts(districts);
  }

  const existingDistrictNames = new Set(
    districts.map((district) => normalizeDistrictName(district.IlceAdi))
  );

  const mergedDistricts = [...districts];

  MISSING_ISTANBUL_DISTRICTS.forEach((districtName) => {
    if (!existingDistrictNames.has(normalizeDistrictName(districtName))) {
      mergedDistricts.push(createVirtualIstanbulDistrict(districtName));
    }
  });

  return sortDistricts(mergedDistricts);
};

export const normalizeDistrictSelection = (city, district) => {
  if (!district || city?.SehirID !== ISTANBUL_CITY_ID) {
    return district;
  }

  if (district.sourceIlceID === ISTANBUL_PRAYER_ZONE_ID) {
    return district;
  }

  const districtName = normalizeDistrictName(district.IlceAdi);

  if (missingDistrictSet.has(districtName)) {
    return createVirtualIstanbulDistrict(districtName);
  }

  return district;
};

export const getPrayerDistrictId = (district) =>
  district?.sourceIlceID || district?.IlceID || null;

export const isVirtualIstanbulDistrict = (district) =>
  Boolean(
    district?._virtual && district?.sourceIlceID === ISTANBUL_PRAYER_ZONE_ID
  );
