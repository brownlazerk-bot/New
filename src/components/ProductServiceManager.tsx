import React, { useState } from 'react';
import { 
  Package, Plus, Search, Filter, Edit, Trash2, CheckCircle2, XCircle, 
  Wine, ChefHat, Waves, Flame, Building, Tag, DollarSign, Layers,
  RefreshCw, Sparkles, Image as ImageIcon, Clock, ShieldCheck, AlertTriangle,
  Grid, List, Barcode, Check, X, Upload
} from 'lucide-react';
import { MenuItem, Category, ProductSection, ItemStatus } from '../types';
import { formatCurrency } from '../lib/currency';

interface ProductServiceManagerProps {
  menuItems: MenuItem[];
  onSaveMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  darkMode: boolean;
}

type SectionTab = 'All' | ProductSection;

export const ProductServiceManager: React.FC<ProductServiceManagerProps> = ({
  menuItems,
  onSaveMenuItem,
  onDeleteMenuItem,
  darkMode
}) => {
  // Navigation & Filtering
  const [activeSection, setActiveSection] = useState<SectionTab>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'OutOfStock'>('All');
  const [sortBy, setSortBy] = useState<'name_asc' | 'price_asc' | 'price_desc' | 'code_asc' | 'newest'>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State
  const [formSection, setFormSection] = useState<ProductSection>('Bar Menu');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<Category>('Beers');
  const [formFoodCat, setFormFoodCat] = useState<string>('Main Course');
  const [formCode, setFormCode] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCostPrice, setFormCostPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('50');
  const [formMainStock, setFormMainStock] = useState<string>('200');
  const [formUnit, setFormUnit] = useState<string>('Bottle');
  const [formPrepTime, setFormPrepTime] = useState<string>('15 mins');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formImage, setFormImage] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');

  // Handle Image File Upload (Convert to Base64 Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset image library
  const presetImages = {
    beer: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format&fit=crop&q=80',
    wine: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80',
    whisky: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80',
    cocktail: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80',
    soda: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80',
    food: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&auto=format&fit=crop&q=80',
    pool: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=300&auto=format&fit=crop&q=80',
    sauna: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&auto=format&fit=crop&q=80',
    room: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
    laundry: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&auto=format&fit=crop&q=80',
    cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80'
  };

  // Helper to determine Section based on Category or item property
  const getItemSection = (item: MenuItem): ProductSection => {
    if (item.productSection) return item.productSection;
    if (item.category === 'Food' || item.isFood) return 'Kitchen Menu';
    if (item.category === 'Pool Services') return 'Swimming Pool';
    if (item.category === 'Sauna Services') return 'Sauna';
    if (item.category === 'Room Services') return 'Room Services';
    if (item.category === 'Apartment Services') return 'Apartment Services';
    if (item.category === 'Other Services') return 'Other Services';
    return 'Bar Menu';
  };

  // Pre-populate Sample Catalog matching requirements
  const handlePopulateSampleCatalog = () => {
    if (menuItems.length > 0) {
      if (!confirm('This will append sample products & services to your existing catalog. Continue?')) {
        return;
      }
    }

    const sampleCatalog: MenuItem[] = [
      // BAR MENU
      {
        id: `prod-bar-1`,
        code: 'BAR-101',
        barcode: '600001',
        name: 'Primus',
        category: 'Beers',
        productSection: 'Bar Menu',
        price: 1500,
        costPrice: 900,
        stockQuantity: 120,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.beer,
        description: 'Cold Rwandan Primus beer 500ml'
      },
      {
        id: `prod-bar-2`,
        code: 'BAR-102',
        barcode: '600002',
        name: 'Mützig',
        category: 'Beers',
        productSection: 'Bar Menu',
        price: 2000,
        costPrice: 1200,
        stockQuantity: 95,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.beer,
        description: 'Mützig premium lager 500ml'
      },
      {
        id: `prod-bar-3`,
        code: 'BAR-103',
        barcode: '600003',
        name: 'Heineken',
        category: 'Beers',
        productSection: 'Bar Menu',
        price: 3000,
        costPrice: 1800,
        stockQuantity: 80,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.beer,
        description: 'Imported Heineken bottle 330ml'
      },
      {
        id: `prod-bar-4`,
        code: 'BAR-104',
        barcode: '600004',
        name: 'Turbo King',
        category: 'Beers',
        productSection: 'Bar Menu',
        price: 2000,
        costPrice: 1100,
        stockQuantity: 60,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.beer,
        description: 'Dark malt beer Turbo King'
      },
      {
        id: `prod-bar-5`,
        code: 'BAR-105',
        barcode: '600005',
        name: 'Fanta Orange',
        category: 'Soft Drinks',
        productSection: 'Bar Menu',
        price: 1000,
        costPrice: 500,
        stockQuantity: 150,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.soda,
        description: 'Cold Fanta Orange 300ml'
      },
      {
        id: `prod-bar-6`,
        code: 'BAR-106',
        barcode: '600006',
        name: 'Sprite',
        category: 'Soft Drinks',
        productSection: 'Bar Menu',
        price: 1000,
        costPrice: 500,
        stockQuantity: 140,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: presetImages.soda,
        description: 'Refreshing Sprite 300ml'
      },
      {
        id: `prod-bar-7`,
        code: 'BAR-107',
        barcode: '600007',
        name: 'Mineral Water 1L',
        category: 'Water',
        productSection: 'Bar Menu',
        price: 1000,
        costPrice: 400,
        stockQuantity: 200,
        unit: 'Bottle',
        status: 'Available',
        active: true,
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80',
        description: 'Pure bottled natural spring water'
      },
      {
        id: `prod-bar-8`,
        code: 'BAR-108',
        barcode: '600008',
        name: 'Fresh Passion Juice',
        category: 'Juices',
        productSection: 'Bar Menu',
        price: 2500,
        costPrice: 1000,
        stockQuantity: 50,
        unit: 'Glass',
        status: 'Available',
        active: true,
        image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80',
        description: 'House-made fresh passion fruit juice'
      },
      {
        id: `prod-bar-9`,
        code: 'BAR-109',
        barcode: '600009',
        name: 'House Red Wine Glass',
        category: 'Wines',
        productSection: 'Bar Menu',
        price: 4500,
        costPrice: 2000,
        stockQuantity: 40,
        unit: 'Glass',
        status: 'Available',
        active: true,
        image: presetImages.wine,
        description: 'Imported Cabernet Sauvignon red wine'
      },
      {
        id: `prod-bar-10`,
        code: 'BAR-110',
        barcode: '600010',
        name: 'Single Malt Whisky Shot',
        category: 'Whisky',
        productSection: 'Bar Menu',
        price: 5000,
        costPrice: 2200,
        stockQuantity: 30,
        unit: 'Shot',
        status: 'Available',
        active: true,
        image: presetImages.whisky,
        description: 'Glenfiddich 12yr Scotch Whisky'
      },
      {
        id: `prod-bar-11`,
        code: 'BAR-111',
        barcode: '600011',
        name: 'Classic Mojito Cocktail',
        category: 'Cocktails',
        productSection: 'Bar Menu',
        price: 6000,
        costPrice: 2500,
        stockQuantity: 50,
        unit: 'Glass',
        status: 'Available',
        active: true,
        image: presetImages.cocktail,
        description: 'Fresh mint, lime, rum, soda'
      },

      // KITCHEN MENU
      {
        id: `prod-kit-1`,
        code: 'KIT-201',
        barcode: '700001',
        name: 'Grilled Chicken',
        category: 'Food',
        foodCategory: 'Grill',
        productSection: 'Kitchen Menu',
        price: 8500,
        costPrice: 4000,
        stockQuantity: 30,
        unit: 'Portion',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '25 mins',
        image: presetImages.chicken,
        description: 'Half spiced grilled chicken served with salad'
      },
      {
        id: `prod-kit-2`,
        code: 'KIT-202',
        barcode: '700002',
        name: 'Chicken with Rice',
        category: 'Food',
        foodCategory: 'Main Course',
        productSection: 'Kitchen Menu',
        price: 7000,
        costPrice: 3200,
        stockQuantity: 35,
        unit: 'Plate',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '20 mins',
        image: presetImages.food,
        description: 'Steamed fragrant jasmine rice with stewed chicken'
      },
      {
        id: `prod-kit-3`,
        code: 'KIT-203',
        barcode: '700003',
        name: 'Beef Brochette',
        category: 'Food',
        foodCategory: 'Grill',
        productSection: 'Kitchen Menu',
        price: 3500,
        costPrice: 1500,
        stockQuantity: 60,
        unit: 'Stick',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '15 mins',
        image: presetImages.food,
        description: 'Tender marinated beef skewer with onions'
      },
      {
        id: `prod-kit-4`,
        code: 'KIT-204',
        barcode: '700004',
        name: 'Whole Fried Tilapia Fish',
        category: 'Food',
        foodCategory: 'Main Course',
        productSection: 'Kitchen Menu',
        price: 12000,
        costPrice: 6000,
        stockQuantity: 20,
        unit: 'Fish',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '30 mins',
        image: presetImages.food,
        description: 'Fresh Lake Kivu tilapia whole fried with fries'
      },
      {
        id: `prod-kit-5`,
        code: 'KIT-205',
        barcode: '700005',
        name: 'Special Rolex (Egg Roll)',
        category: 'Food',
        foodCategory: 'Fast Food',
        productSection: 'Kitchen Menu',
        price: 2500,
        costPrice: 900,
        stockQuantity: 80,
        unit: 'Serving',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '10 mins',
        image: presetImages.food,
        description: 'Chapati rolled with 2 fried eggs, cabbage & tomato'
      },
      {
        id: `prod-kit-6`,
        code: 'KIT-206',
        barcode: '700006',
        name: 'Crispy French Fries',
        category: 'Food',
        foodCategory: 'Side Dish',
        productSection: 'Kitchen Menu',
        price: 2500,
        costPrice: 800,
        stockQuantity: 100,
        unit: 'Portion',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '12 mins',
        image: presetImages.food,
        description: 'Golden fried potato chips'
      },
      {
        id: `prod-kit-7`,
        code: 'KIT-207',
        barcode: '700007',
        name: 'Spiced Beef Pilau Rice',
        category: 'Food',
        foodCategory: 'Main Course',
        productSection: 'Kitchen Menu',
        price: 6000,
        costPrice: 2800,
        stockQuantity: 40,
        unit: 'Plate',
        status: 'Available',
        active: true,
        isFood: true,
        prepTime: '15 mins',
        image: presetImages.food,
        description: 'Aromatic seasoned rice cooked with cubed beef'
      },

      // SWIMMING POOL
      {
        id: `prod-pool-1`,
        code: 'POOL-301',
        barcode: '800001',
        name: 'Adult Pool Day Entry',
        category: 'Pool Services',
        productSection: 'Swimming Pool',
        price: 5000,
        costPrice: 500,
        stockQuantity: 999,
        unit: 'Ticket',
        status: 'Available',
        active: true,
        image: presetImages.pool,
        description: 'Full day adult pass for Olympic resort pool & towel'
      },
      {
        id: `prod-pool-2`,
        code: 'POOL-302',
        barcode: '800002',
        name: 'Child Pool Day Entry',
        category: 'Pool Services',
        productSection: 'Swimming Pool',
        price: 3000,
        costPrice: 300,
        stockQuantity: 999,
        unit: 'Ticket',
        status: 'Available',
        active: true,
        image: presetImages.pool,
        description: 'Full day kids pool access for children under 12 yrs'
      },
      {
        id: `prod-pool-3`,
        code: 'POOL-303',
        barcode: '800003',
        name: 'VIP Pool Lounge Package',
        category: 'Pool Services',
        productSection: 'Swimming Pool',
        price: 15000,
        costPrice: 2000,
        stockQuantity: 999,
        unit: 'Pass',
        status: 'Available',
        active: true,
        image: presetImages.pool,
        description: 'VIP cabana lounger, pool entry, and 1 fresh juice'
      },
      {
        id: `prod-pool-4`,
        code: 'POOL-304',
        barcode: '800004',
        name: 'Family Pool Day Package (4 Pax)',
        category: 'Pool Services',
        productSection: 'Swimming Pool',
        price: 16000,
        costPrice: 1500,
        stockQuantity: 999,
        unit: 'Package',
        status: 'Available',
        active: true,
        image: presetImages.pool,
        description: 'Family pool passes for 2 adults and 2 children'
      },
      {
        id: `prod-pool-5`,
        code: 'POOL-305',
        barcode: '800005',
        name: '1-Hour Swimming Lesson',
        category: 'Pool Services',
        productSection: 'Swimming Pool',
        price: 10000,
        costPrice: 3000,
        stockQuantity: 999,
        unit: 'Session',
        status: 'Available',
        active: true,
        image: presetImages.pool,
        description: 'Private 1-on-1 swim instruction with certified lifeguard'
      },

      // SAUNA
      {
        id: `prod-sauna-1`,
        code: 'SAUNA-401',
        barcode: '900001',
        name: '30 Minutes Sauna Session',
        category: 'Sauna Services',
        productSection: 'Sauna',
        price: 4000,
        costPrice: 500,
        stockQuantity: 999,
        unit: 'Session',
        status: 'Available',
        active: true,
        image: presetImages.sauna,
        description: '30-minute relaxation in dry cedar wood sauna'
      },
      {
        id: `prod-sauna-2`,
        code: 'SAUNA-402',
        barcode: '900002',
        name: '1 Hour Full Sauna Session',
        category: 'Sauna Services',
        productSection: 'Sauna',
        price: 7000,
        costPrice: 800,
        stockQuantity: 999,
        unit: 'Session',
        status: 'Available',
        active: true,
        image: presetImages.sauna,
        description: '60-minute hot stone sauna access with herb steam'
      },
      {
        id: `prod-sauna-3`,
        code: 'SAUNA-403',
        barcode: '900003',
        name: 'VIP Sauna & Steam Suite',
        category: 'Sauna Services',
        productSection: 'Sauna',
        price: 15000,
        costPrice: 2000,
        stockQuantity: 999,
        unit: 'Pass',
        status: 'Available',
        active: true,
        image: presetImages.sauna,
        description: 'Private sauna cabin, eucalyptus steam, and herbal tea'
      },
      {
        id: `prod-sauna-4`,
        code: 'SAUNA-404',
        barcode: '900004',
        name: 'Full Body Massage Package',
        category: 'Sauna Services',
        productSection: 'Sauna',
        price: 25000,
        costPrice: 8000,
        stockQuantity: 999,
        unit: 'Session',
        status: 'Available',
        active: true,
        image: presetImages.sauna,
        description: '45-min therapeutic massage plus 15-min steam bath'
      },

      // ROOM SERVICES
      {
        id: `prod-rm-1`,
        code: 'RM-501',
        barcode: '500001',
        name: 'Express Laundry Service',
        category: 'Room Services',
        productSection: 'Room Services',
        price: 5000,
        costPrice: 1000,
        stockQuantity: 999,
        unit: 'Service',
        status: 'Available',
        active: true,
        image: presetImages.laundry,
        description: 'Same-day washing, drying and pressing per bag'
      },
      {
        id: `prod-rm-2`,
        code: 'RM-502',
        barcode: '500002',
        name: 'In-Room VIP Breakfast',
        category: 'Room Services',
        productSection: 'Room Services',
        price: 10000,
        costPrice: 3500,
        stockQuantity: 999,
        unit: 'Serving',
        status: 'Available',
        active: true,
        image: presetImages.food,
        description: 'Delivered hot breakfast platter, coffee, and fresh juice'
      },
      {
        id: `prod-rm-3`,
        code: 'RM-503',
        barcode: '500003',
        name: 'Kigali Airport Shuttle Pickup',
        category: 'Room Services',
        productSection: 'Room Services',
        price: 35000,
        costPrice: 15000,
        stockQuantity: 999,
        unit: 'Trip',
        status: 'Available',
        active: true,
        image: presetImages.room,
        description: 'Private air-conditioned car transfer from/to airport'
      },
      {
        id: `prod-rm-4`,
        code: 'RM-504',
        barcode: '500004',
        name: 'Extra Rollaway Bed',
        category: 'Room Services',
        productSection: 'Room Services',
        price: 15000,
        costPrice: 2000,
        stockQuantity: 999,
        unit: 'Night',
        status: 'Available',
        active: true,
        image: presetImages.room,
        description: 'Additional comfortable guest mattress setup in room'
      },

      // APARTMENT SERVICES
      {
        id: `prod-apt-1`,
        code: 'APT-601',
        barcode: '400001',
        name: 'Full Apartment Deep Cleaning',
        category: 'Apartment Services',
        productSection: 'Apartment Services',
        price: 12000,
        costPrice: 3000,
        stockQuantity: 999,
        unit: 'Service',
        status: 'Available',
        active: true,
        image: presetImages.cleaning,
        description: 'Complete housekeeping, linen refresh, and kitchen clean'
      },
      {
        id: `prod-apt-2`,
        code: 'APT-602',
        barcode: '400002',
        name: 'Apartment Laundry Package',
        category: 'Apartment Services',
        productSection: 'Apartment Services',
        price: 8000,
        costPrice: 2000,
        stockQuantity: 999,
        unit: 'Bag',
        status: 'Available',
        active: true,
        image: presetImages.laundry,
        description: 'Full basket washing and folding for apartment guests'
      }
    ];

    sampleCatalog.forEach(item => {
      onSaveMenuItem(item);
    });

    alert(`Successfully loaded ${sampleCatalog.length} products & services into your catalog!`);
  };

  // Filter items based on criteria
  const filteredItems = menuItems.filter((item) => {
    const itemSection = getItemSection(item);

    // Section filter
    if (activeSection !== 'All' && itemSection !== activeSection) {
      return false;
    }

    // Subcategory filter
    if (selectedSubCategory !== 'All' && item.category !== selectedSubCategory) {
      return false;
    }

    // Status filter
    if (statusFilter === 'Active' && item.active === false) return false;
    if (statusFilter === 'Inactive' && item.active !== false) return false;
    if (statusFilter === 'OutOfStock' && (item.stockQuantity > 0 || item.status !== 'Out of Stock')) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = (item.code || '').toLowerCase().includes(q);
      const matchBarcode = (item.barcode || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchBarcode && !matchDesc && !matchCat) {
        return false;
      }
    }

    return true;
  });

  // Sort filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'code_asc') return (a.code || a.id).localeCompare(b.code || b.id);
    return 0;
  });

  // Open Modal for Create / Edit
  const handleOpenModal = (item?: MenuItem, defaultSec?: ProductSection) => {
    if (item) {
      const sec = getItemSection(item);
      setEditingItem(item);
      setFormSection(sec);
      setFormName(item.name);
      setFormCategory(item.category);
      setFormFoodCat(item.foodCategory || 'Main Course');
      setFormCode(item.code || item.id);
      setFormBarcode(item.barcode || '');
      setFormPrice(item.price.toString());
      setFormCostPrice(item.costPrice ? item.costPrice.toString() : '');
      setFormStock(item.stockQuantity.toString());
      setFormMainStock(item.mainStockQuantity ? item.mainStockQuantity.toString() : '200');
      setFormUnit(item.unit || 'Bottle');
      setFormPrepTime(item.prepTime || '15 mins');
      setFormActive(item.active !== false);
      setFormImage(item.image || '');
      setFormDescription(item.description || '');
    } else {
      const sec = defaultSec || (activeSection !== 'All' ? activeSection : 'Bar Menu');
      setEditingItem(null);
      setFormSection(sec);
      setFormName('');
      setFormCategory(sec === 'Kitchen Menu' ? 'Food' : sec === 'Swimming Pool' ? 'Pool Services' : sec === 'Sauna' ? 'Sauna Services' : sec === 'Room Services' ? 'Room Services' : sec === 'Apartment Services' ? 'Apartment Services' : sec === 'Other Services' ? 'Other Services' : 'Beers');
      setFormFoodCat('Main Course');
      setFormCode(`${sec.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
      setFormBarcode('');
      setFormPrice('');
      setFormCostPrice('');
      setFormStock(sec === 'Bar Menu' || sec === 'Kitchen Menu' ? '50' : '999');
      setFormUnit(sec === 'Bar Menu' ? 'Bottle' : sec === 'Kitchen Menu' ? 'Portion' : 'Ticket');
      setFormPrepTime('15 mins');
      setFormActive(true);
      setFormImage('');
      setFormDescription('');
    }
    setIsModalOpen(true);
  };

  // Save Product Form Handler
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a product or service name.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price.');
      return;
    }

    const costNum = parseFloat(formCostPrice);
    const stockNum = parseInt(formStock);
    const mainStockNum = parseInt(formMainStock);

    let catToSave: Category = formCategory;
    if (formSection === 'Kitchen Menu') catToSave = 'Food';
    else if (formSection === 'Swimming Pool') catToSave = 'Pool Services';
    else if (formSection === 'Sauna') catToSave = 'Sauna Services';
    else if (formSection === 'Room Services') catToSave = 'Room Services';
    else if (formSection === 'Apartment Services') catToSave = 'Apartment Services';
    else if (formSection === 'Other Services') catToSave = 'Other Services';

    const savedItem: MenuItem = {
      id: editingItem ? editingItem.id : `prod-${Date.now()}`,
      code: formCode || `SKU-${Date.now()}`,
      barcode: formBarcode || undefined,
      name: formName.trim(),
      category: catToSave,
      productSection: formSection,
      foodCategory: formSection === 'Kitchen Menu' ? formFoodCat : undefined,
      price: priceNum,
      costPrice: !isNaN(costNum) && costNum >= 0 ? costNum : undefined,
      stockQuantity: !isNaN(stockNum) ? stockNum : 50,
      mainStockQuantity: formSection === 'Bar Menu' && !isNaN(mainStockNum) ? mainStockNum : undefined,
      unit: formUnit || 'Unit',
      status: (!isNaN(stockNum) && stockNum <= 0) ? 'Out of Stock' : 'Available',
      active: formActive,
      image: formImage.trim() || undefined,
      isFood: formSection === 'Kitchen Menu' || catToSave === 'Food',
      prepTime: formSection === 'Kitchen Menu' ? formPrepTime : undefined,
      description: formDescription.trim() || undefined
    };

    onSaveMenuItem(savedItem);
    setIsModalOpen(false);
  };

  // Toggle Active/Inactive directly
  const handleToggleActive = (item: MenuItem) => {
    const updated: MenuItem = {
      ...item,
      active: item.active === false ? true : false
    };
    onSaveMenuItem(updated);
  };

  // Counts for Metrics
  const totalItems = menuItems.length;
  const activeCount = menuItems.filter(i => i.active !== false).length;
  const barCount = menuItems.filter(i => getItemSection(i) === 'Bar Menu').length;
  const kitchenCount = menuItems.filter(i => getItemSection(i) === 'Kitchen Menu').length;
  const poolSaunaCount = menuItems.filter(i => getItemSection(i) === 'Swimming Pool' || getItemSection(i) === 'Sauna').length;
  const roomAptCount = menuItems.filter(i => getItemSection(i) === 'Room Services' || getItemSection(i) === 'Apartment Services').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Products & Services Management
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Admin Master Portal
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage Bar drinks, Kitchen food menu, Pool & Sauna passes, Room & Apartment services connected automatically to POS.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePopulateSampleCatalog}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-bold flex items-center space-x-1.5 transition-all"
              title="Pre-populate prompt items: Primus, Heineken, Grilled Chicken, Pool entry, Sauna, Laundry, etc."
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Load Sample Catalog</span>
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Product or Service</span>
            </button>
          </div>
        </div>

        {/* Executive Catalog Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Items</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalItems}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount} Active</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Bar Menu</p>
              <Wine className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{barCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Beverages & Drinks</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Kitchen Menu</p>
              <ChefHat className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{kitchenCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Food & Dishes</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Pool & Sauna</p>
              <Waves className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{poolSaunaCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Passes & Sessions</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Room & Apt</p>
              <Building className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{roomAptCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Guest Folio Services</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">POS Sync</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">Live</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Instant Cashier Availability</p>
          </div>
        </div>

        {/* Section Tabs Bar */}
        <div className="flex overflow-x-auto gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 no-scrollbar">
          {[
            { id: 'All' as SectionTab, label: `All Items (${totalItems})`, icon: Layers },
            { id: 'Bar Menu' as SectionTab, label: `Bar Menu (${barCount})`, icon: Wine },
            { id: 'Kitchen Menu' as SectionTab, label: `Kitchen Menu (${kitchenCount})`, icon: ChefHat },
            { id: 'Swimming Pool' as SectionTab, label: 'Swimming Pool', icon: Waves },
            { id: 'Sauna' as SectionTab, label: 'Sauna', icon: Flame },
            { id: 'Room Services' as SectionTab, label: 'Room Services', icon: Building },
            { id: 'Apartment Services' as SectionTab, label: 'Apartment Services', icon: Building },
            { id: 'Other Services' as SectionTab, label: 'Other Services', icon: Tag },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSection(tab.id);
                  setSelectedSubCategory('All');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Toolbar: Search, Filters, View Toggles */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU code, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filter Dropdowns & Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
            <option value="OutOfStock">Out of Stock Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="code_asc">Code: SKU (A-Z)</option>
          </select>

          {/* View Mode */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-gray-400'}`}
              title="Grid Cards View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-gray-400'}`}
              title="Compact Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Catalog View */}
      {sortedItems.length === 0 ? (
        <div className={`p-12 rounded-2xl border text-center ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No Products or Services Found
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
            {searchQuery
              ? `No items matching "${searchQuery}". Try clearing search filters.`
              : `Your ${activeSection} catalog is currently empty.`}
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => handleOpenModal(undefined, activeSection !== 'All' ? activeSection : 'Bar Menu')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Item</span>
            </button>
            <button
              onClick={handlePopulateSampleCatalog}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Sample Catalog</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map((item) => {
            const sec = getItemSection(item);
            const isActive = item.active !== false;
            const marginPct = item.costPrice && item.costPrice > 0
              ? Math.round(((item.price - item.costPrice) / item.price) * 100)
              : null;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                } ${!isActive ? 'opacity-60 bg-gray-50 dark:bg-gray-950' : 'hover:border-amber-500/50'}`}
              >
                <div>
                  {/* Image / Header */}
                  <div className="relative h-36 w-full rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        {sec === 'Bar Menu' && <Wine className="w-10 h-10 text-amber-500 opacity-60" />}
                        {sec === 'Kitchen Menu' && <ChefHat className="w-10 h-10 text-orange-500 opacity-60" />}
                        {sec === 'Swimming Pool' && <Waves className="w-10 h-10 text-cyan-500 opacity-60" />}
                        {sec === 'Sauna' && <Flame className="w-10 h-10 text-rose-500 opacity-60" />}
                        {(sec === 'Room Services' || sec === 'Apartment Services') && <Building className="w-10 h-10 text-purple-500 opacity-60" />}
                        {sec === 'Other Services' && <Tag className="w-10 h-10 text-emerald-500 opacity-60" />}
                      </div>
                    )}

                    {/* Section Badge */}
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-950/80 text-white backdrop-blur-md">
                      {sec}
                    </span>

                    {/* Active Status Badge */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 backdrop-blur-md ${
                        isActive
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-rose-500/90 text-white'
                      }`}
                      title="Click to toggle Active / Inactive"
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>

                    {/* Code / SKU overlay */}
                    {item.code && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-slate-950/70 text-amber-300">
                        {item.code}
                      </span>
                    )}
                  </div>

                  {/* Title & Category */}
                  <div className="flex justify-between items-start gap-1 mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-gray-500 mb-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                      {item.category}
                    </span>
                    {item.prepTime && (
                      <span className="flex items-center text-orange-600 dark:text-orange-400 font-medium">
                        <Clock className="w-3 h-3 mr-0.5" />
                        {item.prepTime}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                </div>

                <div>
                  {/* Price & Cost Margin */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Selling Price</p>
                      <p className="text-base font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(item.price)}
                      </p>
                      {item.costPrice && item.costPrice > 0 && (
                        <p className="text-[10px] text-gray-400">
                          Cost: {formatCurrency(item.costPrice)} {marginPct !== null && `(${marginPct}% margin)`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-amber-500/20 hover:text-amber-600 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteMenuItem(item.id)}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-rose-500/20 hover:text-rose-600 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-2">Code / SKU</th>
                  <th className="py-3 px-2">Item Name</th>
                  <th className="py-3 px-2">Section</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2 text-right">Selling Price</th>
                  <th className="py-3 px-2 text-right">Cost Price</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {sortedItems.map((item) => {
                  const sec = getItemSection(item);
                  const isActive = item.active !== false;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {item.code || item.id}
                      </td>
                      <td className="py-3 px-2 font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {sec}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                        {item.category}
                      </td>
                      <td className="py-3 px-2 text-right font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-500">
                        {item.costPrice ? formatCurrency(item.costPrice) : '-'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center space-x-1">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:text-amber-500"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMenuItem(item.id)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT OR SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
            darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">
                  {editingItem ? 'Edit Product / Service' : 'Add New Product or Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Section Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Product / Service Section *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    'Bar Menu', 'Kitchen Menu', 'Swimming Pool', 'Sauna',
                    'Room Services', 'Apartment Services', 'Other Services'
                  ].map((sec) => (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => {
                        setFormSection(sec as ProductSection);
                        if (sec === 'Kitchen Menu') setFormCategory('Food');
                        else if (sec === 'Swimming Pool') setFormCategory('Pool Services');
                        else if (sec === 'Sauna') setFormCategory('Sauna Services');
                        else if (sec === 'Room Services') setFormCategory('Room Services');
                        else if (sec === 'Apartment Services') setFormCategory('Apartment Services');
                        else if (sec === 'Other Services') setFormCategory('Other Services');
                        else setFormCategory('Beers');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        formSection === sec
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Product / Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formSection === 'Bar Menu' ? 'e.g. Primus, Heineken, Fanta' :
                      formSection === 'Kitchen Menu' ? 'e.g. Grilled Chicken, Beef Brochette' :
                      formSection === 'Swimming Pool' ? 'e.g. Adult Pool Entry, Family Pass' :
                      'e.g. 30 Mins Sauna, Laundry'
                    }
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Unique Code / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BAR-101"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Category
                  </label>
                  {formSection === 'Bar Menu' ? (
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as Category)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="Beers">Beers</option>
                      <option value="Soft Drinks">Soft Drinks</option>
                      <option value="Wines">Wines</option>
                      <option value="Whisky">Whisky</option>
                      <option value="Cocktails">Cocktails</option>
                      <option value="Juices">Juices</option>
                      <option value="Water">Water</option>
                      <option value="Coffee">Coffee</option>
                      <option value="Tea">Tea</option>
                    </select>
                  ) : formSection === 'Kitchen Menu' ? (
                    <select
                      value={formFoodCat}
                      onChange={(e) => setFormFoodCat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="Main Course">Main Course</option>
                      <option value="Grill">Grill</option>
                      <option value="Fast Food">Fast Food</option>
                      <option value="Starter">Starter</option>
                      <option value="Side Dish">Side Dish</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={formCategory}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 600001"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Selling Price (RWF) *
                  </label>
                  <input
                    type="number"
                    required
                    step="1"
                    placeholder="e.g. 2000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Cost Price (RWF)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 1200"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Stock, Unit, Prep Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {formSection === 'Bar Menu' ? 'Bar Stock (Active)' : formSection === 'Kitchen Menu' ? 'Kitchen Stock' : 'Initial Stock Level'}
                  </label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {formSection === 'Bar Menu' && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-1">
                      Main Beverage Stock
                    </label>
                    <input
                      type="number"
                      value={formMainStock}
                      onChange={(e) => setFormMainStock(e.target.value)}
                      placeholder="Store / Warehouse"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bottle, Plate, Ticket, Hour"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {formSection === 'Kitchen Menu' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Preparation Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15-20 mins"
                      value={formPrepTime}
                      onChange={(e) => setFormPrepTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Product Image Attachment Upload & Presets */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Product Image Attachment *
                </label>
                
                <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-3 mb-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    
                    {/* Image Thumbnail Preview */}
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                      {formImage ? (
                        <>
                          <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormImage('')}
                            className="absolute inset-0 bg-slate-950/80 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition-opacity"
                            title="Remove image"
                          >
                            <X className="w-4 h-4 mb-0.5 text-rose-400" />
                            Remove
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2 text-gray-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span className="text-[9px] font-medium block">No attachment</span>
                        </div>
                      )}
                    </div>

                    {/* File Attachment Button & URL Input */}
                    <div className="flex-1 space-y-2 flex flex-col justify-center">
                      <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all text-center">
                        <Upload className="w-4 h-4" />
                        <span>Upload Image File</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageFileUpload}
                          className="hidden" 
                        />
                      </label>

                      <div className="relative">
                        <input
                          type="url"
                          placeholder="Or enter image web URL (https://...)"
                          value={formImage}
                          onChange={(e) => setFormImage(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Quick Select */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Sample Presets:</span>
                      {[
                        { label: 'Beer', url: presetImages.beer },
                        { label: 'Wine', url: presetImages.wine },
                        { label: 'Cocktail', url: presetImages.cocktail },
                        { label: 'Soda', url: presetImages.soda },
                        { label: 'Food', url: presetImages.food },
                        { label: 'Chicken', url: presetImages.chicken },
                        { label: 'Pool', url: presetImages.pool },
                        { label: 'Sauna', url: presetImages.sauna },
                        { label: 'Room', url: presetImages.room },
                        { label: 'Laundry', url: presetImages.laundry }
                      ].map((p) => (
                        <button
                          type="button"
                          key={p.label}
                          onClick={() => setFormImage(p.url)}
                          className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-amber-500 hover:text-slate-950 font-medium transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional details about this product or service..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-bold text-xs text-gray-900 dark:text-white">Active Status</p>
                  <p className="text-[10px] text-gray-400">Inactive products are hidden from POS cashiers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    formActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {formActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Product</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
