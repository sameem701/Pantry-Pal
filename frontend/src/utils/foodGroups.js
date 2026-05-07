// Food group categorization for shopping list display
// Keys are lowercase partial ingredient name matches → group label

const GROUP_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery & Bread',
  'Grains & Pasta',
  'Canned & Jarred',
  'Spices & Condiments',
  'Oils & Sauces',
  'Frozen',
  'Other',
];

const RULES = [
  // Produce
  { group: 'Produce', terms: [
    'tomato','lettuce','spinach','kale','arugula','onion','garlic','ginger','carrot','celery',
    'broccoli','cauliflower','zucchini','courgette','cucumber','pepper','capsicum','chilli','chili',
    'avocado','lime','lemon','orange','apple','banana','grape','berry','strawberry','blueberry',
    'raspberry','mango','pineapple','melon','watermelon','peach','pear','plum','apricot',
    'mushroom','potato','sweet potato','yam','corn','pea','bean sprout','bok choy','cabbage',
    'leek','shallot','scallion','spring onion','parsley','cilantro','coriander','basil','mint',
    'thyme','rosemary','dill','chive','sage','tarragon','fennel','beetroot','beet','radish',
    'asparagus','artichoke','eggplant','aubergine','squash','pumpkin',
  ]},
  // Meat & Seafood
  { group: 'Meat & Seafood', terms: [
    'chicken','beef','pork','lamb','turkey','duck','veal','bacon','sausage','mince','ground beef',
    'steak','chop','rib','brisket','tenderloin','fillet','salmon','tuna','cod','tilapia','shrimp',
    'prawn','scallop','crab','lobster','clam','mussel','squid','calamari','anchovy','sardine',
    'fish','seafood','ham','pancetta','prosciutto','chorizo',
  ]},
  // Dairy & Eggs
  { group: 'Dairy & Eggs', terms: [
    'milk','cream','butter','cheese','cheddar','mozzarella','parmesan','feta','gouda','brie',
    'ricotta','cottage cheese','cream cheese','sour cream','yogurt','yoghurt','egg','ghee',
    'half-and-half','condensed milk','evaporated milk','buttermilk','whipping cream','heavy cream',
  ]},
  // Bakery & Bread
  { group: 'Bakery & Bread', terms: [
    'bread','bun','roll','bagel','pita','naan','tortilla','wrap','croissant','baguette',
    'sourdough','rye bread','ciabatta',
  ]},
  // Grains & Pasta
  { group: 'Grains & Pasta', terms: [
    'rice','pasta','spaghetti','penne','fettuccine','linguine','tagliatelle','rigatoni','orzo',
    'couscous','quinoa','oat','flour','semolina','cornmeal','polenta','barley','lentil',
    'chickpea','black bean','kidney bean','white bean','cannellini','noodle','ramen','udon',
    'vermicelli','breadcrumb',
  ]},
  // Canned & Jarred
  { group: 'Canned & Jarred', terms: [
    'canned','tinned','tomato paste','tomato sauce','coconut milk','broth','stock','soup',
    'bean','chickpea','lentil (canned)','olive','pickle','capers','sun-dried','jam','jelly',
    'peanut butter','almond butter','tahini','miso','curry paste','fish sauce',
  ]},
  // Spices & Condiments
  { group: 'Spices & Condiments', terms: [
    'salt','pepper','cumin','coriander seed','turmeric','paprika','cayenne','cinnamon','nutmeg',
    'cardamom','clove','allspice','star anise','bay leaf','oregano','mixed spice','curry powder',
    'garam masala','five spice','chilli flakes','red pepper flakes','mustard','ketchup',
    'mayonnaise','relish','horseradish','worcestershire','hot sauce','sriracha','soy sauce',
    'vinegar','balsamic','apple cider vinegar','sugar','brown sugar','honey','maple syrup',
    'vanilla','baking powder','baking soda','yeast','cocoa','chocolate',
  ]},
  // Oils & Sauces
  { group: 'Oils & Sauces', terms: [
    'oil','olive oil','vegetable oil','canola oil','sesame oil','coconut oil','butter (cooking)',
    'lard','shortening','cooking spray','sauce','gravy','teriyaki','hoisin','oyster sauce',
  ]},
  // Frozen
  { group: 'Frozen', terms: [
    'frozen','ice cream','sorbet','frozen pea','frozen corn','frozen spinach','frozen berry',
  ]},
];

export function getGroup(itemName) {
  if (!itemName) return 'Other';
  const lower = itemName.toLowerCase();
  for (const rule of RULES) {
    if (rule.terms.some(t => lower.includes(t))) return rule.group;
  }
  return 'Other';
}

export function groupItems(items) {
  const map = {};
  for (const group of GROUP_ORDER) map[group] = [];
  for (const item of items) {
    const g = getGroup(item.ingredient_name || item.name || '');
    map[g].push(item);
  }
  return GROUP_ORDER
    .filter(g => map[g].length > 0)
    .map(g => ({ group: g, items: map[g] }));
}

export { GROUP_ORDER };
