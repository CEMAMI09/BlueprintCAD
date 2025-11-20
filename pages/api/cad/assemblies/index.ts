import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/db';
import { AssemblyDocument } from '@/lib/cad/assembly-system';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetAssemblies(req, res);
  } else if (req.method === 'POST') {
    return handleCreateAssembly(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetAssemblies(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { folderId, userId } = req.query;
    const db = await getDb();

    let query = `
      SELECT 
        a.id,
        a.name,
        a.folder_id,
        a.created_at,
        a.updated_at,
        a.author_id,
        a.version,
        a.description,
        a.tags,
        u.username as author_username
      FROM cad_assemblies a
      LEFT JOIN users u ON a.author_id = u.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (folderId) {
      conditions.push('a.folder_id = ?');
      params.push(parseInt(folderId as string));
    }

    if (userId) {
      conditions.push('a.author_id = ?');
      params.push(parseInt(userId as string));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.updated_at DESC';

    const result = await db.all(query, params);

    return res.status(200).json({
      assemblies: result
    });
  } catch (error) {
    console.error('Error getting assemblies:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleCreateAssembly(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, folderId, userId } = req.body;
    const db = await getDb();

    if (!name || !userId) {
      return res.status(400).json({ message: 'Name and userId are required' });
    }

    // Create assembly document
    const assemblyDoc: AssemblyDocument = {
      id: `assembly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      folderId,
      instances: [],
      constraints: [],
      subAssemblies: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: userId.toString(),
        version: 1,
        description: '',
        tags: []
      },
      permissions: {
        canEdit: true,
        canView: true,
        canDelete: true,
        isOwner: true
      }
    };

    // Insert into database
    const insertQuery = `
      INSERT INTO cad_assemblies 
        (id, name, folder_id, author_id, version, description, tags, data, created_at, updated_at)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await db.run(insertQuery, [
      assemblyDoc.id,
      assemblyDoc.name,
      assemblyDoc.folderId || null,
      userId,
      assemblyDoc.metadata.version,
      assemblyDoc.metadata.description,
      JSON.stringify(assemblyDoc.metadata.tags),
      JSON.stringify({
        instances: assemblyDoc.instances,
        constraints: assemblyDoc.constraints,
        subAssemblies: assemblyDoc.subAssemblies
      })
    ]);

    return res.status(201).json({
      assembly: assemblyDoc,
      dbId: result.lastID
    });
  } catch (error) {
    console.error('Error creating assembly:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
