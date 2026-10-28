import type { Dish, Merchant } from '../types';

// Fotografias ilustrativas locais: não dependem de um serviço aleatório na demo.
// Origem e licença em assets/food/CREDITS.md.
const photos = {
  burger: require('../../assets/food/burger.jpg'),
  pizza: require('../../assets/food/pizza.jpg'),
  sushi: require('../../assets/food/sushi.jpg'),
  rice: require('../../assets/food/rice.jpg'),
  acai: require('../../assets/food/acai.jpg'),
  bread: require('../../assets/food/bread.jpg'),
  grill: require('../../assets/food/grill.jpg'),
  bakery: require('../../assets/food/bakery.jpg'),
  salad: require('../../assets/food/salad.jpg'),
  pasta: require('../../assets/food/pasta.jpg'),
  seafood: require('../../assets/food/seafood.jpg'),
  cake: require('../../assets/food/cake.jpg'),
  coffee: require('../../assets/food/coffee.jpg'),
  fries: require('../../assets/food/fries.jpg'),
};

export function dishArtwork(dish: Dish) {
  if (dish.id === 'd04') return photos.fries;
  if (dish.id === 'd28') return photos.coffee;
  if (dish.id === 'd26') return photos.bread;
  if (dish.id === 'd14') return photos.grill;
  const byMerchant: Record<string, keyof typeof photos> = {
    m1: 'burger', m2: 'pizza', m3: 'sushi', m4: 'rice', m5: 'acai',
    m6: 'grill', m7: 'seafood', m8: 'bakery', m9: 'salad',
    m10: 'pasta', m11: 'seafood', m12: 'cake',
  };
  return photos[byMerchant[dish.merchantId] ?? 'rice'];
}

export function merchantInitials(merchant: Merchant) {
  return merchant.name.split(' ').filter((word) => word.length > 3).slice(0, 2).map((word) => word[0]).join('');
}
