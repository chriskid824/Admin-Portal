// B -> Baby, K -> Kids, M -> Mens, W -> Womens, F -> Free size, U -> Unisex
const sizeChart = {
  5: { // Nike
    M1: 'MENS US 3.5 - 18',
    M3: 'MENS XXS - 4XL',
    M6: 'MENS BOTTOM 26 - 40',
    W1: 'WOMENS US 5 - 15',
    W3: 'WOMENS XXS - XXL',
    B1: 'BABY US 1C - 10C',
    K0: 'KIDS US 10.5C - 3Y',
    K1: 'KIDS US 3.5Y - 10.5Y',
    'K0:K1': 'KIDS US 10.5C - 10.5Y',
    K5: 'KIDS Boys XS - XL',
    F5: 'Free Size',
  },
  6: { // Adidas
    B1: 'BABY US 1K - 10.5K',
    B4: 'BABY CLOTHING 56 - 104',
    F5: 'FREE SIZE',
    K0: 'KIDS US 10.5K - 3.5',
    K1: 'KIDS US 3.5 - 7.5',
    'K0:K1': 'KIDS US 10.5K - 7.5',
    K3: 'KIDS SOCKS KXS - KXXL',
    K4: 'KIDS CLOTHING 92 - 140',
    K5: 'KIDS CLOTHING 116 - 176',
    M1: 'MENS US 3.5 - 17',
    M2: 'MENS GOLF US 3.5 - 17 / CM 21.5 - 32.5',
    M3: 'MENS XXS - 4XL',
    M4: 'MENS TOP 44 - 68',
    M5: 'MENS PANTS 28 - 46',
    'Slide-B7': 'BABY SLIDER US 3K - 11K',
    'Slide-K8': 'KIDS SLIDER US 8K - 6Y',
    'Slide-M7': 'MENS SLIDER US 4 - 15',
    'Slide-M8': 'WOMENS SLIDER US 4 - 13',
    U3: 'UNISEX SOCKS US XS - XXL',
    W1: 'WOMENS US 4.5 - 15.5',
    W2: 'WOMENS GOLF US 4.5 - 15.5 / CM 21.5 - 31',
    W3: 'WOMENS US XXS - XXL',
    W4: 'WOMENS TOPS UK 28 - 52 (2XS - 2XL)',
    W5: 'WOMENS BOTTOMS UK 30 -52 (2XS - 2XL)',
  },
  23: { // Vans
    B1: 'BABY US 2.5C - 10C',
    K1: 'KIDS US 3.5 - 7',
    K2: 'KIDS US 10.5C - 3',
    M1: 'MENS US 3.5 - 13',
    M3: 'MENS US XS - XXL',
    W1: 'WOMENS US 5 - 12',
    W3: 'WOEMNS US XS - XXL',
  },
  38: { // Converse
    B1: 'BABY US 1K - 10K',
    K1: 'KIDS US 3.5 - 7',
    K2: 'KIDS US 10K - 3',
    'K1:K2': 'KIDS US 10K - 7',
    K5: 'KIDS US S - XL',
    N: 'WHOLESALE',
    M2: 'MENS NON-ALL STAR US 3 - 15',
    M5: 'MENS US XS - XXL',
    M8: 'MENS ALL STAR US 3 - 14',
    U9: 'UNISEX ONE SIZE',
    U10: 'WOMENS ONE SIZE',
    W2: 'WOMENS US 4.5 - 16.5',
    W5: 'WOMENS US XXS - XXL',
    W7: 'WOMENS ALL STAR 5/B US 4 - 14',
    W8: 'WOMENS ALL STAR US 5 - 14',
  },
  39: { // New Balance
    B1: 'BABY US 0C - 10C',
    K1: 'KIDS US 3.5 - 7',
    K2: 'KIDS US 10.5C - 3',
    M1: 'MENS US 4 - 20',
    M2: 'MENS SHOES US S- XL / KOREA 220mm - 295mm',
    M3: 'MENS US XXS - 4XL',
    'Slide-K8': 'KIDS SLIDER US 11C - 7',
    'Slide-M6': 'MENS SLIDER US 2 - 15 ',
    'Slide-W7': 'WOMENS US 4 - 15 ',
    W1: 'WOMENS US 3 - 15',
    W3: 'WOMENS US XXS - XXL',
  },
  159: { // Reebok
    B1: 'BABY US 0K - 10K',
    K1: 'KIDS US 3 - 8',
    K2: 'KIDS US 10.5K - 3',
    'K1:K2': 'KIDS US 10.5K - 8',
    M1: 'MENS US 3.5 - 15',
    M3: 'MENS US XXS - 4XL',
    N: 'WHOLESALE',
    U1: 'UNISEX US 4 - 12',
    W1: 'WOMENS US 5 - 12',
    W3: 'WOMENS XXS - XXL',
  },
  189: { // Puma
    B1: 'BABY US 1K - 10K',
    K1: 'KIDS US 4 - 7',
    K2: 'KIDS US 10.5K - 3.5',
    'K1:K2': 'KIDS US 10.5K - 7',
    K5: 'KIDS US XS - XXL',
    M1: 'MENS US 4 - 16',
    M3: 'MENS US XXS - XXXL',
    'Slide-M7': 'MENS SLIDER US 4 - 14',
    'Slide-W7': 'WOMENS SLIDER US 5 - 10',
    W1: 'WOMENS US 5.5 - 11',
    W3: 'WOMENS US XXS - XXL',
  },
  865: { // Li Ning
    W1: 'WOMENS US 4 - 12',
    M1: 'MENS US 2 - 13',
    M5: 'MENS US XS - XXXL',
  },
  3205: { // On Running
    W1: 'WOMENS US 5 - 11',
    M1: 'MENS US 7 - 14',
  },
};
function getSizeDisplayName(brand, genderCode) {
  return sizeChart?.[brand]?.[genderCode] ?? '';
}

export default { getSizeDisplayName };
