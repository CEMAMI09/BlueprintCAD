// Get all license types
import { getDb } from '@/db/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const licenseTypes = await db.all(
      `SELECT 
        id, code, name, description,
        allows_personal_print, allows_personal_modify,
        allows_sell_file, allows_sell_physical,
        allows_commercial_use, allows_resell_file,
        allows_bundle, allows_mass_manufacturing,
        no_restrictions
      FROM license_types
      ORDER BY id ASC`
    );

    res.status(200).json(licenseTypes.map(lt => ({
      code: lt.code,
      name: lt.name,
      description: lt.description,
      allows_personal_print: lt.allows_personal_print === 1,
      allows_personal_modify: lt.allows_personal_modify === 1,
      allows_sell_file: lt.allows_sell_file === 1,
      allows_sell_physical: lt.allows_sell_physical === 1,
      allows_commercial_use: lt.allows_commercial_use === 1,
      allows_resell_file: lt.allows_resell_file === 1,
      allows_bundle: lt.allows_bundle === 1,
      allows_mass_manufacturing: lt.allows_mass_manufacturing === 1,
      no_restrictions: lt.no_restrictions === 1,
    })));
  } catch (error) {
    console.error('License types fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch license types' });
  }
}

