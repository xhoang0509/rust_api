import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { AuthorForm } from '../components/AuthorForm';
import { AuthorList } from '../components/AuthorList';
import { PostForm } from '../components/PostForm';
import { PostList } from '../components/PostList';
import { SearchBar } from '../components/SearchBar';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import {
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from '../api/authors';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
} from '../api/posts';
import type {
  Author,
  CreateAuthor,
  UpdateAuthor,
  PostWithAuthor,
  CreatePost,
  UpdatePost,
} from '../types';

export const DashboardView: FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'authors'>('posts');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Authors state
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorFormLoading, setAuthorFormLoading] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [authorError, setAuthorError] = useState<string | null>(null);

  // Posts state & pagination/filtering
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postFormLoading, setPostFormLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithAuthor | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [authorFilterId, setAuthorFilterId] = useState<number | undefined>(undefined);

  // Alert/Notification banner state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  // Check health endpoint
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setApiStatus('online');
          return;
        }
      }
      setApiStatus('offline');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  // Fetch authors
  const loadAuthors = useCallback(async () => {
    setAuthorsLoading(true);
    try {
      const data = await getAuthors();
      setAuthors(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch authors';
      setAuthorError(msg);
    } finally {
      setAuthorsLoading(false);
    }
  }, []);

  // Fetch posts with filters and pagination
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await getPosts({
        page,
        limit,
        search: search.trim() ? search.trim() : undefined,
        author_id: authorFilterId,
      });
      setPosts(res.items);
      setTotalPages(res.total_pages);
      setTotalPosts(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch posts';
      setPostError(msg);
    } finally {
      setPostsLoading(false);
    }
  }, [page, limit, search, authorFilterId]);

  // Initial load triggered only when DashboardView is mounted (user is authenticated)
  useEffect(() => {
    checkHealth();
    loadAuthors();
  }, [checkHealth, loadAuthors]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Author Handlers
  const handleAuthorSubmit = async (data: CreateAuthor | UpdateAuthor) => {
    setAuthorFormLoading(true);
    setAuthorError(null);
    try {
      if (editingAuthor) {
        const updated = await updateAuthor(editingAuthor.id, data);
        setAuthors((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        setEditingAuthor(null);
        showAlert('success', `Author "${updated.name}" updated successfully.`);
      } else {
        const created = await createAuthor(data as CreateAuthor);
        setAuthors((prev) => [...prev, created]);
        showAlert('success', `Author "${created.name}" created successfully.`);
      }
      // Refresh posts as author details might be linked
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setAuthorError(msg);
      throw err;
    } finally {
      setAuthorFormLoading(false);
    }
  };

  const handleAuthorDelete = async (id: number) => {
    try {
      await deleteAuthor(id);
      setAuthors((prev) => prev.filter((a) => a.id !== id));
      if (editingAuthor?.id === id) {
        setEditingAuthor(null);
      }
      showAlert('success', 'Author and associated posts deleted successfully.');
      // If deleted author was in filter, reset filter
      if (authorFilterId === id) {
        setAuthorFilterId(undefined);
      }
      // Refresh posts because cascade deletion deletes author's posts
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete author';
      showAlert('error', msg);
    }
  };

  // Post Handlers
  const handlePostSubmit = async (data: CreatePost | UpdatePost) => {
    setPostFormLoading(true);
    setPostError(null);
    try {
      if (editingPost) {
        const updated = await updatePost(editingPost.id, data as UpdatePost);
        setEditingPost(null);
        showAlert('success', `Post "${updated.title}" updated successfully.`);
      } else {
        const created = await createPost(data as CreatePost);
        showAlert('success', `Post "${created.title}" created successfully.`);
      }
      // Reload posts from server to respect current page / search filters
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setPostError(msg);
      throw err;
    } finally {
      setPostFormLoading(false);
    }
  };

  const handlePostDelete = async (id: number) => {
    try {
      await deletePost(id);
      if (editingPost?.id === id) {
        setEditingPost(null);
      }
      showAlert('success', 'Post deleted successfully.');
      // If deleting the last item on a page > 1, step back a page
      if (posts.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadPosts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete post';
      showAlert('error', msg);
    }
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to page 1 on search change
  };

  const handleAuthorFilterChange = (newAuthorId?: number) => {
    setAuthorFilterId(newAuthorId);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleClearFilters = () => {
    setSearch('');
    setAuthorFilterId(undefined);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🦀
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Rust Axum + SQLite + React</h1>
              <p className="text-xs text-gray-500">Full-stack CRUD Application</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Health status indicator */}
            <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-green-500 animate-pulse'
                    : apiStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              ></span>
              <span className="text-gray-600">
                API:{' '}
                <strong
                  className={
                    apiStatus === 'online'
                      ? 'text-green-700'
                      : apiStatus === 'offline'
                      ? 'text-red-700'
                      : 'text-yellow-700'
                  }
                >
                  {apiStatus.toUpperCase()}
                </strong>
              </span>
            </div>

            {/* Auth User Profile Badge & Logout */}
            {currentUser && (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-800 leading-none">{currentUser.name}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{currentUser.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-medium text-gray-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Alert Banner */}
        {alert && (
          <div
            className={`mb-6 p-4 rounded-xl shadow-xs border flex items-center justify-between transition-all ${
              alert.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{alert.type === 'success' ? '✓' : '⚠️'}</span>
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'posts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Posts</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'posts'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {totalPosts}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('authors')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'authors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>Authors</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'authors'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {authors.length}
            </span>
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'authors' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 sticky top-24">
              <AuthorForm
                authorToEdit={editingAuthor}
                onSubmit={handleAuthorSubmit}
                onCancel={() => setEditingAuthor(null)}
                isLoading={authorFormLoading}
                error={authorError}
              />
            </div>
            <div className="lg:col-span-2">
              <AuthorList
                authors={authors}
                onEdit={(author) => {
                  setEditingAuthor(author);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handleAuthorDelete}
                isLoading={authorsLoading}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 sticky top-24">
              <PostForm
                postToEdit={editingPost}
                authors={authors}
                onSubmit={handlePostSubmit}
                onCancel={() => setEditingPost(null)}
                isLoading={postFormLoading}
                error={postError}
              />
            </div>
            <div className="lg:col-span-2">
              <SearchBar
                authors={authors}
                search={search}
                authorId={authorFilterId}
                onSearchChange={handleSearchChange}
                onAuthorChange={handleAuthorFilterChange}
                onClear={handleClearFilters}
              />
              <PostList
                posts={posts}
                totalPosts={totalPosts}
                onEdit={(post) => {
                  setEditingPost(post);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handlePostDelete}
                isLoading={postsLoading}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                total={totalPosts}
                limit={limit}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                isLoading={postsLoading}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-500">
          Rust Axum SQLite Backend & React TypeScript Tailwind Frontend
        </div>
      </footer>
    </div>
  );
};
