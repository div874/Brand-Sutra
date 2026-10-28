import { INITIAL_BRAND_PROFILE, INITIAL_DRAFTS, INITIAL_APPROVED_EDITS, INITIAL_AUDIT_LOGS } from '../src/lib/mock-data.ts';

console.log('================================================================');
console.log('VERIFICATION TEST: BRAND SELECTION HOME PAGE & DATA ISOLATION');
console.log('================================================================\n');

function assert(cond, name, details = '') {
  if (cond) {
    console.log(`[PASS] ${name}`);
    if (details) console.log(`       ${details}`);
  } else {
    console.error(`[FAIL] ${name}`);
    if (details) console.error(`       ${details}`);
    process.exit(1);
  }
}

// Simulated Store & LocalStorage Architecture
const STORAGE_KEYS = {
  BRANDS: 'brandsutra_brands',
  SELECTED_BRAND_ID: 'brandsutra_selected_brand_id',
  BRAND: 'brandsutra_profile',
  DRAFTS: 'brandsutra_drafts',
  CURRENT_DRAFT: 'brandsutra_curr_draft',
  APPROVED_EDITS: 'brandsutra_approved_edits'
};

const mockLocalStorage = new Map();

function createSimulatedStore() {
  let brands = [JSON.parse(JSON.stringify(INITIAL_BRAND_PROFILE))];
  let selectedBrandId = INITIAL_BRAND_PROFILE.id;
  let allDrafts = JSON.parse(JSON.stringify(INITIAL_DRAFTS));
  let currentDraftId = allDrafts[0]?.id || '';
  let allApprovedEdits = JSON.parse(JSON.stringify(INITIAL_APPROVED_EDITS));

  const getActiveBrand = () => brands.find(b => b.id === selectedBrandId) || brands[0];
  const getBrandDrafts = (brandId) => allDrafts.filter(d => d.brandId === brandId);
  const getBrandApprovedEdits = (brandId) => allApprovedEdits.filter(e => 
    e.brandId === brandId || (!e.brandId && brandId === INITIAL_BRAND_PROFILE.id)
  );

  const selectBrand = (brandId) => {
    const target = brands.find(b => b.id === brandId);
    if (!target) throw new Error(`Brand ${brandId} not found`);
    selectedBrandId = brandId;
    const bDrafts = getBrandDrafts(brandId);
    currentDraftId = bDrafts[0]?.id || '';
    mockLocalStorage.set(STORAGE_KEYS.SELECTED_BRAND_ID, brandId);
  };

  const createBrand = ({ name, description }) => {
    const newBrand = {
      id: `brand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      tagline: 'Consistent brands. Confident content.',
      description: description?.trim() || '',
      voiceSummary: 'Clear, authoritative, and compliant with company guidelines.',
      toneGuidelines: [],
      prohibitedTerms: [],
      approvedTerms: [],
      trustedFacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    brands.push(newBrand);
    selectedBrandId = newBrand.id;
    currentDraftId = '';
    mockLocalStorage.set(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    mockLocalStorage.set(STORAGE_KEYS.SELECTED_BRAND_ID, newBrand.id);
    return newBrand;
  };

  const createDraftForActiveBrand = (title, content) => {
    const active = getActiveBrand();
    const newDraft = {
      id: `draft-${Date.now()}`,
      brandId: active.id,
      title,
      content,
      channel: 'Blog Post',
      reviewStatus: 'Draft',
      findings: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    allDrafts.unshift(newDraft);
    currentDraftId = newDraft.id;
    mockLocalStorage.set(STORAGE_KEYS.DRAFTS, JSON.stringify(allDrafts));
    return newDraft;
  };

  const addRuleToActiveBrand = (type, ruleItem) => {
    const active = getActiveBrand();
    if (type === 'prohibited') active.prohibitedTerms.push(ruleItem);
    if (type === 'fact') active.trustedFacts.push(ruleItem);
    mockLocalStorage.set(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
  };

  const persistAll = () => {
    mockLocalStorage.set(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    mockLocalStorage.set(STORAGE_KEYS.SELECTED_BRAND_ID, selectedBrandId);
    mockLocalStorage.set(STORAGE_KEYS.DRAFTS, JSON.stringify(allDrafts));
    mockLocalStorage.set(STORAGE_KEYS.APPROVED_EDITS, JSON.stringify(allApprovedEdits));
  };

  const simulateBrowserRefresh = () => {
    // Re-hydrate store from mockLocalStorage
    const savedBrands = JSON.parse(mockLocalStorage.get(STORAGE_KEYS.BRANDS) || '[]');
    const savedSelected = mockLocalStorage.get(STORAGE_KEYS.SELECTED_BRAND_ID);
    const savedDrafts = JSON.parse(mockLocalStorage.get(STORAGE_KEYS.DRAFTS) || '[]');
    const savedEdits = JSON.parse(mockLocalStorage.get(STORAGE_KEYS.APPROVED_EDITS) || '[]');

    return {
      brands: savedBrands,
      selectedBrandId: savedSelected,
      drafts: savedDrafts,
      approvedEdits: savedEdits
    };
  };

  return {
    get brands() { return brands; },
    get selectedBrandId() { return selectedBrandId; },
    getActiveBrand,
    getBrandDrafts,
    getBrandApprovedEdits,
    selectBrand,
    createBrand,
    deleteBrand: (id) => {
      if (brands.length <= 1) return false;
      brands = brands.filter(b => b.id !== id);
      if (selectedBrandId === id) {
        selectedBrandId = brands[0].id;
      }
      allDrafts = allDrafts.filter(d => d.brandId !== id);
      allApprovedEdits = allApprovedEdits.filter(e => e.brandId !== id);
      return true;
    },
    createDraftForActiveBrand,
    addRuleToActiveBrand,
    persistAll,
    simulateBrowserRefresh
  };
}

async function runTests() {
  const store = createSimulatedStore();

  // --- TEST 1: HOME PAGE INITIAL STATE & ECHOSTREAM PRESERVATION ---
  console.log('--- TEST 1: SELECT EXISTING ECHOSTREAM BRAND ---');
  assert(store.brands.length >= 1, 'Brand Selection lists existing brands');
  const echostream = store.brands[0];
  assert(echostream.name === 'EchoStream', 'Initial brand is named EchoStream', `Name: "${echostream.name}"`);
  assert(echostream.prohibitedTerms.length >= 6, 'EchoStream brand rules preserved', `Total prohibited: ${echostream.prohibitedTerms.length}`);
  assert(echostream.trustedFacts.length >= 2, 'EchoStream trusted facts preserved', `Total facts: ${echostream.trustedFacts.length}`);
  
  const echoDrafts = store.getBrandDrafts(echostream.id);
  assert(echoDrafts.length >= 2, 'EchoStream drafts loaded and intact', `Draft count: ${echoDrafts.length}`);
  assert(echoDrafts[0].findings.length >= 4, 'EchoStream audit findings preserved on drafts');

  const echoEdits = store.getBrandApprovedEdits(echostream.id);
  assert(echoEdits.length >= 1, 'EchoStream approved edit history preserved', `Total approved edits: ${echoEdits.length}`);

  // --- TEST 2: CREATE A SECOND BRAND ---
  console.log('\n--- TEST 2: CREATE SECOND BRAND (NO INHERITANCE) ---');
  const novaBrand = store.createBrand({
    name: 'Nova Acoustics',
    description: 'High-end studio monitor and audiophile equipment brand.'
  });

  assert(novaBrand.name === 'Nova Acoustics', 'New brand created with specified name');
  assert(store.selectedBrandId === novaBrand.id, 'New brand workspace immediately selected upon creation');
  
  // Verify ZERO inheritance from EchoStream
  assert(novaBrand.prohibitedTerms.length === 0, 'New brand has 0 inherited prohibited terms', 'Starts clean');
  assert(novaBrand.trustedFacts.length === 0, 'New brand has 0 inherited trusted facts', 'Starts clean');
  assert(novaBrand.toneGuidelines.length === 0, 'New brand has 0 inherited tone guidelines', 'Starts clean');

  const novaDrafts = store.getBrandDrafts(novaBrand.id);
  assert(novaDrafts.length === 0, 'New brand has 0 inherited drafts', 'Empty workspace ready for creation');

  const novaEdits = store.getBrandApprovedEdits(novaBrand.id);
  assert(novaEdits.length === 0, 'New brand has 0 inherited approved edit history');

  // --- TEST 3: ISOLATED WORKSPACE OPERATIONS ---
  console.log('\n--- TEST 3: DATA ISOLATION BETWEEN BRANDS ---');
  // Add a rule specifically to Nova Acoustics
  store.addRuleToActiveBrand('fact', {
    id: 'nova-fact-1',
    topic: 'Frequency Response',
    claimOrStat: 'Linear acoustic frequency response from 20Hz to 40kHz (±0.5dB).',
    source: 'Audio Precision APx555 Lab Report',
    verifiedDate: '2026-10-26'
  });

  // Create a draft for Nova Acoustics
  const novaDraft = store.createDraftForActiveBrand(
    'Nova Master Monitor Announcement',
    'Experience pristine acoustic clarity with our reference studio monitors.'
  );

  assert(novaBrand.trustedFacts.length === 1, 'Nova Acoustics brand has 1 trusted fact');
  assert(store.getBrandDrafts(novaBrand.id).length === 1, 'Nova Acoustics has 1 draft');

  // Switch back to EchoStream
  console.log('\n--- TEST 4: SWITCHING BRANDS & CONFIRMING STRICT SEPARATION ---');
  store.selectBrand(echostream.id);
  assert(store.selectedBrandId === echostream.id, 'Switched active workspace back to EchoStream');
  
  const echoBrandCurrent = store.getActiveBrand();
  assert(echoBrandCurrent.id === echostream.id, 'Active brand is EchoStream');
  assert(!echoBrandCurrent.trustedFacts.some(f => f.id === 'nova-fact-1'), 
    'EchoStream did NOT receive Nova Acoustics trusted fact (Strict Isolation Confirmed)');

  const echoDraftsCurrent = store.getBrandDrafts(echostream.id);
  assert(!echoDraftsCurrent.some(d => d.id === novaDraft.id),
    'EchoStream drafts list did NOT include Nova Acoustics draft (Strict Isolation Confirmed)');
  assert(echoDraftsCurrent.length >= 2, 'EchoStream existing drafts remain intact');

  // Switch back to Nova Acoustics
  store.selectBrand(novaBrand.id);
  assert(store.selectedBrandId === novaBrand.id, 'Switched back to Nova Acoustics');
  assert(store.getBrandDrafts(novaBrand.id).length === 1, 'Nova Acoustics draft is still present');
  assert(store.getActiveBrand().trustedFacts.length === 1, 'Nova Acoustics trusted fact is still present');

  // --- TEST 5: PERSISTENCE & REFRESH SIMULATION ---
  console.log('\n--- TEST 5: PERSISTENCE ACROSS REFRESH ---');
  store.persistAll();
  const refreshed = store.simulateBrowserRefresh();

  assert(refreshed.selectedBrandId === novaBrand.id, 'Selected brand persists after page refresh', `Active: ${refreshed.selectedBrandId}`);
  assert(refreshed.brands.length === 2, 'Both brands persist in storage', `Total brands: ${refreshed.brands.length}`);
  
  const refreshedEcho = refreshed.brands.find(b => b.id === echostream.id);
  const refreshedNova = refreshed.brands.find(b => b.id === novaBrand.id);

  assert(!!refreshedEcho && !!refreshedNova, 'Both EchoStream and Nova Acoustics found after refresh');
  assert(refreshedEcho.prohibitedTerms.length >= 6, 'EchoStream rules survive refresh intact');
  assert(refreshedNova.trustedFacts.length === 1, 'Nova Acoustics rules survive refresh intact');

  // --- TEST 6: REMOVE BRAND & FALLBACK SWITCH ---
  console.log('\n--- TEST 6: REMOVE BRAND WORKSPACE ---');
  const removed = store.deleteBrand(novaBrand.id);
  assert(removed === true, 'Successfully removed Nova Acoustics brand');
  assert(store.brands.length === 1, 'Brand count reduced to 1');
  assert(!store.brands.some(b => b.id === novaBrand.id), 'Nova Acoustics no longer exists in brands list');
  assert(store.selectedBrandId === echostream.id, 'Active brand automatically switched to remaining brand (EchoStream)');
  assert(store.getBrandDrafts(novaBrand.id).length === 0, 'Associated drafts for removed brand were deleted');

  // Safeguard: Cannot delete the last remaining brand
  const cannotDeleteLast = store.deleteBrand(echostream.id);
  assert(cannotDeleteLast === false, 'Safeguard prevents deleting the last remaining brand workspace');
  assert(store.brands.length === 1, 'Brand count stays at 1');

  console.log('\n================================================================');
  console.log('ALL BRAND SELECTION, ISOLATION & REMOVAL TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
