const { filterProjectsByPrivacy } = require('../lib/privacy-utils');

// Test data simulating projects from users with different privacy settings
const testProjects = [
  {
    id: 1,
    title: 'Public Project from Private Profile',
    username: 'private_user',
    is_public: 1,  // Public project
    profile_private: 1  // But user has private profile
  },
  {
    id: 2,
    title: 'Private Project from Private Profile',
    username: 'private_user',
    is_public: 0,  // Private project
    profile_private: 1  // Private profile
  },
  {
    id: 3,
    title: 'Public Project from Public Profile',
    username: 'public_user',
    is_public: 1,  // Public project
    profile_private: 0  // Public profile
  },
  {
    id: 4,
    title: 'Private Project from Public Profile',
    username: 'public_user',
    is_public: 0,  // Private project
    profile_private: 0  // Public profile
  }
];

console.log('Testing privacy filter for anonymous viewer (not logged in)...\n');

filterProjectsByPrivacy(testProjects, null).then(filtered => {
  console.log('Results (should show projects 1 and 3 - all public projects):');
  filtered.forEach(p => {
    console.log(`  ✓ Project ${p.id}: ${p.title}`);
  });
  
  console.log('\nExpected: 2 projects (IDs 1 and 3)');
  console.log(`Actual: ${filtered.length} projects`);
  
  if (filtered.length === 2 && 
      filtered.find(p => p.id === 1) && 
      filtered.find(p => p.id === 3)) {
    console.log('\n✅ TEST PASSED: Public projects visible regardless of profile privacy!');
  } else {
    console.log('\n❌ TEST FAILED: Privacy filter not working correctly');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
