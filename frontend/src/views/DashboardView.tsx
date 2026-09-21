import React, { useState, useEffect, useCallback } from 'react';
import { Pagination } from 'antd';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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

import { AppHeader } from '../components/layout/AppHeader';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { FeedFilterBar } from '../components/feed/FeedFilterBar';
import { PostModalForm } from '../components/feed/PostModalForm';
import { PostList } from '../components/PostList';
import { MembersView } from '../components/members/MembersView';
import { AuthorModalForm } from '../components/members/AuthorModalForm';

export const DashboardView: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'my-posts'>('feed');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Authors state
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [authorFormLoading, setAuthorFormLoading] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [authorError, setAuthorError] = useState<string | null>(null);

  // Posts state & pagination/filtering
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postFormLoading, setPostFormLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithAuthor | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [authorFilterId, setAuthorFilterId] = useState<number | undefined>(undefined);

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
      const msg = err instanceof Error ? err.message : 'Tải danh sách tác giả thất bại';
      showToast(msg, 'error');
    } finally {
      setAuthorsLoading(false);
    }
  }, [showToast]);

  // Fetch posts with filters and pagination
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      let filterId = authorFilterId;
      if (activeTab === 'my-posts' && currentUser) {
        // Find author ID for current logged in user
        const matchedAuthor = authors.find(
          (a) => a.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        if (matchedAuthor) {
          filterId = matchedAuthor.id;
        }
      }

      const res = await getPosts({
        page,
        limit,
        search: search.trim() ? search.trim() : undefined,
        author_id: filterId,
      });
      setPosts(res.items);
      setTotalPages(res.total_pages);
      setTotalPosts(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải danh sách bài viết thất bại';
      showToast(msg, 'error');
    } finally {
      setPostsLoading(false);
    }
  }, [page, limit, search, authorFilterId, activeTab, currentUser, authors, showToast]);

  useEffect(() => {
    checkHealth();
    loadAuthors();
  }, [checkHealth, loadAuthors]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Tab switching handler
  const handleTabChange = (tab: 'feed' | 'members' | 'my-posts') => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'feed') {
      setAuthorFilterId(undefined);
    }
  };

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
        showToast(`Đã cập nhật tác giả "${updated.name}"`, 'success');
      } else {
        const created = await createAuthor(data as CreateAuthor);
        setAuthors((prev) => [...prev, created]);
        showToast(`Đã thêm tác giả "${created.name}"`, 'success');
      }
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác thất bại';
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
      showToast('Đã xóa tác giả và các bài viết liên quan', 'success');
      if (authorFilterId === id) {
        setAuthorFilterId(undefined);
      }
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa tác giả thất bại';
      showToast(msg, 'error');
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
        showToast(`Đã cập nhật bài viết "${updated.title}"`, 'success');
      } else {
        const created = await createPost(data as CreatePost);
        showToast(`Đã đăng bài viết "${created.title}"`, 'success');
      }
      loadPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng bài viết thất bại';
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
      showToast('Đã xóa bài viết', 'success');
      if (posts.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadPosts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa bài viết thất bại';
      showToast(msg, 'error');
    }
  };

  const handleOpenCreatePost = () => {
    setEditingPost(null);
    setPostError(null);
    setPostModalOpen(true);
  };

  const handleEditPost = (post: PostWithAuthor) => {
    setEditingPost(post);
    setPostError(null);
    setPostModalOpen(true);
  };

  const handleOpenCreateAuthor = () => {
    setEditingAuthor(null);
    setAuthorError(null);
    setAuthorModalOpen(true);
  };

  const handleEditAuthor = (author: Author) => {
    setEditingAuthor(author);
    setAuthorError(null);
    setAuthorModalOpen(true);
  };

  const handleFilterPostsByAuthor = (authorId: number) => {
    setAuthorFilterId(authorId);
    setActiveTab('feed');
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setSearch('');
    setAuthorFilterId(undefined);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <AppHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        apiStatus={apiStatus}
        onOpenCreatePost={handleOpenCreatePost}
        onLogout={logout}
      />

      {/* 3-Column Layout: Left Sidebar + Center Feed/Members + Right Sidebar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-5 flex-1 w-full flex justify-center gap-4 xl:gap-6">
        {/* Left Column (Navigation & Profile) */}
        <LeftSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          totalPosts={totalPosts}
          totalAuthors={authors.length}
        />

        {/* Center Column (Feed / Content) */}
        <main className="w-full max-w-2xl min-w-0 flex-1">
          {activeTab === 'members' ? (
            <MembersView
              authors={authors}
              isLoading={authorsLoading}
              onEdit={handleEditAuthor}
              onDelete={handleAuthorDelete}
              onOpenCreateModal={handleOpenCreateAuthor}
              onFilterPostsByAuthor={handleFilterPostsByAuthor}
            />
          ) : (
            <>
              {/* Create Post Card */}
              <CreatePostCard
                currentUser={currentUser}
                onOpenModal={handleOpenCreatePost}
              />

              {/* Feed Filter & Search */}
              <FeedFilterBar
                authors={authors}
                search={search}
                authorId={authorFilterId}
                onSearchChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                onAuthorChange={(val) => {
                  setAuthorFilterId(val);
                  setPage(1);
                }}
                onClear={handleClearFilters}
              />

              {/* Feed Header Notice for 'my-posts' */}
              {activeTab === 'my-posts' && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                  <span>
                    Đang hiển thị <strong>Bài viết của tôi</strong> ({totalPosts} bài)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTabChange('feed')}
                    className="font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem tất cả bài viết
                  </button>
                </div>
              )}

              {/* Post Feed List */}
              <PostList
                posts={posts}
                totalPosts={totalPosts}
                onEdit={handleEditPost}
                onDelete={handlePostDelete}
                isLoading={postsLoading}
                onOpenCreatePost={handleOpenCreatePost}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center py-6">
                  <Pagination
                    current={page}
                    total={totalPosts}
                    pageSize={limit}
                    onChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    showSizeChanger={false}
                    className="bg-white px-4 py-2 rounded-2xl shadow-xs"
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Column (Community Highlights & Guidelines) */}
        <RightSidebar
          authors={authors}
          selectedAuthorId={authorFilterId}
          onSelectAuthor={(id) => {
            setAuthorFilterId(id);
            setPage(1);
          }}
          onOpenCreateAuthor={handleOpenCreateAuthor}
        />
      </div>

      {/* Post Modal Form */}
      <PostModalForm
        open={postModalOpen}
        onClose={() => {
          setPostModalOpen(false);
          setEditingPost(null);
        }}
        onSubmit={handlePostSubmit}
        authors={authors}
        currentUser={currentUser}
        postToEdit={editingPost}
        isLoading={postFormLoading}
        error={postError}
      />

      {/* Author Modal Form */}
      <AuthorModalForm
        open={authorModalOpen}
        onClose={() => {
          setAuthorModalOpen(false);
          setEditingAuthor(null);
        }}
        onSubmit={handleAuthorSubmit}
        authorToEdit={editingAuthor}
        isLoading={authorFormLoading}
        error={authorError}
      />
    </div>
  );
};
