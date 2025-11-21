import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Comment {
  id: number;
  content: string;
  user_id: number;
  username: string;
  avatar?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  edited: boolean;
  replies: Comment[];
  reaction_count: number;
  user_reactions?: string;
  is_annotation: boolean;
  annotation_data?: any;
}

interface CommentSystemProps {
  entityType: 'project' | 'folder';
  entityId: number;
  currentUserId?: number;
  currentUsername?: string;
  onAnnotationClick?: (annotation: any) => void;
  inline?: boolean;
}

export default function CommentSystem({
  entityType,
  entityId,
  currentUserId,
  currentUsername,
  onAnnotationClick,
  inline = false
}: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
  }, [entityType, entityId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments/on/${entityType}/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (parentId?: number) => {
    const content = parentId ? (document.getElementById(`reply-${parentId}`) as HTMLTextAreaElement)?.value : newComment;
    
    if (!content || content.trim().length === 0) return;

    try {
      const res = await fetch(`/api/comments/on/${entityType}/${entityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.trim(),
          parent_id: parentId
        })
      });

      if (res.ok) {
        setNewComment('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleEditComment = async (commentId: number) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: editContent })
      });

      if (res.ok) {
        setEditingComment(null);
        setEditContent('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReaction = async (commentId: number, reactionType: string) => {
    try {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reaction_type: reactionType })
      });
      fetchComments();
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  const detectMentions = (text: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      setShowMentions(true);
      // In production, fetch actual user suggestions
      setMentionSuggestions(['user1', 'user2', 'testuser']);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = newComment.substring(0, cursorPos);
    const textAfter = newComment.substring(cursorPos);
    const lastAtPos = textBefore.lastIndexOf('@');
    
    const newText = textBefore.substring(0, lastAtPos) + `@${username} ` + textAfter;
    setNewComment(newText);
    setShowMentions(false);
    textarea.focus();
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingComment === comment.id;
    const isAuthor = comment.user_id === currentUserId;
    const canEdit = isAuthor;
    const canDelete = isAuthor; // Add admin check in production

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {comment.username[0].toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.username}</span>
              <span className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {comment.edited && (
                <span className="text-xs text-gray-500 italic">(edited)</span>
              )}
              {comment.is_annotation && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                  📌 Annotation
                </span>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-sm text-gray-300 mb-2">{children}</p>,
                    code: ({ children }) => (
                      <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">{children}</code>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    )
                  }}
                >
                  {comment.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => handleReaction(comment.id, 'like')}
                  className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1"
                >
                  👍 {comment.reaction_count > 0 && comment.reaction_count}
                </button>
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs text-gray-500 hover:text-blue-400"
                >
                  Reply
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="text-xs text-gray-500 hover:text-yellow-400"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs text-gray-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}

            {/* Reply Box */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  id={`reply-${comment.id}`}
                  placeholder={`Reply to ${comment.username}...`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitComment(comment.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className={`${inline ? 'h-full flex flex-col' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
        <button
          onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
          className="text-xs text-gray-500 hover:text-gray-400"
        >
          {showMarkdownPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* New Comment */}
      <div className="mb-6 relative">
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => {
            setNewComment(e.target.value);
            detectMentions(e.target.value);
          }}
          placeholder="Write a comment... (Markdown supported, use @username to mention)"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          rows={3}
        />
        
        {/* Mention Suggestions */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {mentionSuggestions.map((username) => (
              <button
                key={username}
                onClick={() => insertMention(username)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
              >
                @{username}
              </button>
            ))}
          </div>
        )}

        {showMarkdownPreview && newComment && (
          <div className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 mb-2">Preview:</div>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{newComment}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Tip:</span> Use **bold**, *italic*, `code`, or @mention users
          </div>
          <button
            onClick={() => handleSubmitComment()}
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
          >
            Post Comment
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className={`space-y-4 ${inline ? 'flex-1 overflow-y-auto' : ''}`}>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}
