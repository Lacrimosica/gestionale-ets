import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua e Barbuda' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaigian' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BE', name: 'Belgio' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BY', name: 'Bielorussia' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia e Erzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brasile' },
  { code: 'GB', name: 'Britannia' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambogia' },
  { code: 'CM', name: 'Camerun' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Capo Verde' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'CZ', name: 'Cechia' },
  { code: 'CF', name: 'Ciad' },
  { code: 'CL', name: 'Cile' },
  { code: 'CN', name: 'Cina' },
  { code: 'CY', name: 'Cipro' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comore' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (RDC)' },
  { code: 'KR', name: 'Corea del Sud' },
  { code: 'KP', name: 'Corea del Nord' },
  { code: 'CI', name: 'Costa d\'Avorio' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croazia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'DJ', name: 'Gibuti' },
  { code: 'DK', name: 'Danimarca' },
  { code: 'DE', name: 'Germania' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Repubblica Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egitto' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'AE', name: 'Emirati Arabi Uniti' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Etiopia' },
  { code: 'FJ', name: 'Figi' },
  { code: 'PH', name: 'Filippine' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'JM', name: 'Giamaica' },
  { code: 'JP', name: 'Giappone' },
  { code: 'GI', name: 'Gibilterra' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GQ', name: 'Guinea Equatoriale' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'GF', name: 'Guyana Francese' },
  { code: 'GP', name: 'Guadalupa' },
  { code: 'GU', name: 'Guam' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GL', name: 'Groenlandia' },
  { code: 'GR', name: 'Grecia' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HN', name: 'Honduras' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IS', name: 'Islanda' },
  { code: 'BV', name: 'Isola Bouvet' },
  { code: 'KY', name: 'Isole Cayman' },
  { code: 'CX', name: 'Isola Christmas' },
  { code: 'CC', name: 'Isole Cocos' },
  { code: 'FK', name: 'Isole Falkland' },
  { code: 'FO', name: 'Isole Faroe' },
  { code: 'GS', name: 'Georgia del Sud e Isole Sandwich Australi' },
  { code: 'HM', name: 'Isole Heard e McDonald' },
  { code: 'PN', name: 'Isole Pitcairn' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SJ', name: 'Isole Svalbard e Jan Mayen' },
  { code: 'TC', name: 'Isole Turks e Caicos' },
  { code: 'VI', name: 'Isole Vergini Americane' },
  { code: 'VG', name: 'Isole Vergini Britanniche' },
  { code: 'IO', name: 'Territorio Britannico dell\'Oceano Indiano' },
  { code: 'IM', name: 'Isola di Man' },
  { code: 'IL', name: 'Israele' },
  { code: 'JE', name: 'Jersey' },
  { code: 'KZ', name: 'Kazakistan' },
  { code: 'KE', name: 'Kenia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kirghizistan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LV', name: 'Lettonia' },
  { code: 'LB', name: 'Libano' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Lussemburgo' },
  { code: 'MO', name: 'Macao' },
  { code: 'MK', name: 'Macedonia del Nord' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MY', name: 'Malesia' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MV', name: 'Maldive' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MA', name: 'Marocco' },
  { code: 'MQ', name: 'Martinica' },
  { code: 'MH', name: 'Isole Marshall' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'MX', name: 'Messico' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MD', name: 'Moldavia' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MZ', name: 'Mozambico' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NZ', name: 'Nuova Zelanda' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NU', name: 'Niue' },
  { code: 'NO', name: 'Norvegia' },
  { code: 'NC', name: 'Nuova Caledonia' },
  { code: 'NE', name: 'Niger' },
  { code: 'OM', name: 'Oman' },
  { code: 'NL', name: 'Paesi Bassi' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua Nuova Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perù' },
  { code: 'PF', name: 'Polinesia Francese' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portogallo' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Riunione' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'EH', name: 'Sahara Occidentale' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'SH', name: 'Sant\'Elena' },
  { code: 'KN', name: 'Saint Kitts e Nevis' },
  { code: 'LC', name: 'Santa Lucia' },
  { code: 'MF', name: 'Saint Martin' },
  { code: 'PM', name: 'Saint Pierre e Miquelon' },
  { code: 'VC', name: 'Saint Vincent e Grenadine' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé e Príncipe' },
  { code: 'SE', name: 'Svezia' },
  { code: 'CH', name: 'Svizzera' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seicelle' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SY', name: 'Siria' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'US', name: 'Stati Uniti' },
  { code: 'ZA', name: 'Sud Africa' },
  { code: 'SS', name: 'Sudan del Sud' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'TJ', name: 'Tagikistan' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TF', name: 'Terre Australi Francesi' },
  { code: 'TL', name: 'Timor Est' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TG', name: 'Togo' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TT', name: 'Trinidad e Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turchia' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UA', name: 'Ucraina' },
  { code: 'UG', name: 'Uganda' },
  { code: 'HU', name: 'Ungheria' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Città del Vaticano' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'WF', name: 'Wallis e Futuna' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

interface CountryComboboxProps {
  value: string;
  onChange: (country: string) => void;
  label?: string;
}

const CountryCombobox = ({ value, onChange, label = 'Paese' }: CountryComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.name === value) || COUNTRIES[0];

  const handleSelect = (country: string) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm || selectedCountry.name}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none pr-10"
          placeholder="Seleziona o digita..."
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filtered.length > 0 ? (
              filtered.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleSelect(country.name)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 text-sm"
                >
                  {country.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-slate-500 text-sm">Nessun paese trovato</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryCombobox;
