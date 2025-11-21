import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db', 'forge.db');

export async function POST(req: NextRequest) {
  try {
    const { fileId, treeData, version, branchId } = await req.json();

    if (!fileId || !treeData) {
      return NextResponse.json(
        { error: 'File ID and tree data required' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    try {
      // Check if file exists
      const file = db.prepare('SELECT * FROM cad_files WHERE id = ?').get(fileId);
      
      if (!file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // Store feature tree
      const stmt = db.prepare(`
        INSERT INTO cad_feature_trees (file_id, tree_data, version, branch_id, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      const result = stmt.run(
        fileId,
        treeData,
        version || 1,
        branchId || 'main'
      );

      // Update file's updated_at
      db.prepare('UPDATE cad_files SET updated_at = datetime("now") WHERE id = ?').run(fileId);

      return NextResponse.json({
        success: true,
        treeId: result.lastInsertRowid,
        version,
        branchId: branchId || 'main'
      });

    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Feature tree save error:', error);
    return NextResponse.json(
      { error: 'Failed to save feature tree' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const branchId = searchParams.get('branchId') || 'main';

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    try {
      // Get latest feature tree for file and branch
      const tree = db.prepare(`
        SELECT * FROM cad_feature_trees 
        WHERE file_id = ? AND branch_id = ?
        ORDER BY version DESC, created_at DESC
        LIMIT 1
      `).get(fileId, branchId);

      if (!tree) {
        return NextResponse.json(
          { error: 'Feature tree not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        treeData: tree.tree_data,
        version: tree.version,
        branchId: tree.branch_id,
        createdAt: tree.created_at
      });

    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Feature tree load error:', error);
    return NextResponse.json(
      { error: 'Failed to load feature tree' },
      { status: 500 }
    );
  }
}

// Get feature tree history
export async function PUT(req: NextRequest) {
  try {
    const { fileId, branchId } = await req.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    try {
      const history = db.prepare(`
        SELECT id, version, branch_id, created_at
        FROM cad_feature_trees 
        WHERE file_id = ? ${branchId ? 'AND branch_id = ?' : ''}
        ORDER BY created_at DESC
        LIMIT 50
      `).all(branchId ? [fileId, branchId] : [fileId]);

      return NextResponse.json({ history });

    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Feature tree history error:', error);
    return NextResponse.json(
      { error: 'Failed to load history' },
      { status: 500 }
    );
  }
}
