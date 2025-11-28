import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/db/db';
import { AssemblyDocument, PartInstance, AssemblyConstraint } from '../../../shared/utils/cad/assembly-system.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Assembly ID is required' });
  }

  if (req.method === 'GET') {
    return handleGetAssembly(id, req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateAssembly(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteAssembly(id, req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetAssembly(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const query = `
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
        a.data,
        u.username as author_username
      FROM cad_assemblies a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `;

    const row = await db.get(query, [id]);

    if (!row) {
      return res.status(404).json({ message: 'Assembly not found' });
    }
    const data = row.data || { instances: [], constraints: [], subAssemblies: [] };

    // Reconstruct AssemblyDocument
    const assemblyDoc: AssemblyDocument = {
      id: row.id,
      name: row.name,
      folderId: row.folder_id,
      instances: data.instances || [],
      constraints: data.constraints || [],
      subAssemblies: data.subAssemblies || [],
      metadata: {
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        author: row.author_username || row.author_id.toString(),
        version: row.version,
        description: row.description || '',
        tags: Array.isArray(row.tags) ? row.tags : []
      },
      permissions: {
        canEdit: true, // TODO: Check actual permissions based on user
        canView: true,
        canDelete: true,
        isOwner: true
      }
    };

    return res.status(200).json({ assembly: assemblyDoc });
  } catch (error) {
    console.error('Error getting assembly:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleUpdateAssembly(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const { name, instances, constraints, subAssemblies, metadata } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (metadata?.description !== undefined) {
      updates.push('description = ?');
      params.push(metadata.description);
    }

    if (metadata?.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(metadata.tags));
    }

    if (metadata?.version !== undefined) {
      updates.push('version = ?');
      params.push(metadata.version);
    }

    // Update data JSON
    if (instances !== undefined || constraints !== undefined || subAssemblies !== undefined) {
      updates.push('data = ?');
      params.push(JSON.stringify({
        instances: instances || [],
        constraints: constraints || [],
        subAssemblies: subAssemblies || []
      }));
    }

    updates.push("updated_at = datetime('now')");
    params.push(id); // For WHERE clause

    const query = `
      UPDATE cad_assemblies
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const result = await db.run(query, params);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Assembly not found' });
    }

    // Fetch updated record
    const updated = await db.get('SELECT * FROM cad_assemblies WHERE id = ?', [id]);

    return res.status(200).json({
      message: 'Assembly updated successfully',
      assembly: updated
    });
  } catch (error) {
    console.error('Error updating assembly:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteAssembly(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const query = 'DELETE FROM cad_assemblies WHERE id = ?';
    const result = await db.run(query, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Assembly not found' });
    }

    return res.status(200).json({
      message: 'Assembly deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting assembly:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
