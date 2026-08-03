import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Loader2,
} from 'lucide-react';

import { faqService, AdminFaqCategory, AdminFaqQuestion } from '@/services/faqService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';

export const AdminFaqsPage: React.FC = () => {
  const [categories, setCategories] = useState<AdminFaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminFaqCategory | null>(null);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryOrder, setCategoryOrder] = useState(0);
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminFaqQuestion | null>(null);
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemQuestion, setItemQuestion] = useState('');
  const [itemAnswer, setItemAnswer] = useState('');
  const [itemOrder, setItemOrder] = useState(0);
  const [itemIsActive, setItemIsActive] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // Delete Confirmation Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'item';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const data = await faqService.getAdminFaqs();
      setCategories(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to fetch FAQs');
    } finally {
      setLoading(false);
    }
  };

  // --- Category Handlers ---
  const handleOpenCategoryModal = (cat?: AdminFaqCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryTitle(cat.title);
      setCategoryOrder(cat.order || 0);
      setCategoryIsActive(cat.isActive !== false);
    } else {
      setEditingCategory(null);
      setCategoryTitle('');
      setCategoryOrder(categories.length);
      setCategoryIsActive(true);
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryTitle.trim()) {
      toast.error('Category heading title is required');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await faqService.updateCategory(editingCategory._id, {
          title: categoryTitle.trim(),
          order: categoryOrder,
          isActive: categoryIsActive,
        });
        toast.success('Category updated successfully');
      } else {
        await faqService.createCategory({
          title: categoryTitle.trim(),
          order: categoryOrder,
          isActive: categoryIsActive,
        });
        toast.success('Category created successfully');
      }
      setIsCategoryModalOpen(false);
      fetchFaqs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  // --- Question & Answer Item Handlers ---
  const handleOpenItemModal = (catId?: string, item?: AdminFaqQuestion) => {
    if (item) {
      setEditingItem(item);
      setItemCategoryId(item.categoryId);
      setItemQuestion(item.question);
      setItemAnswer(item.answer);
      setItemOrder(item.order || 0);
      setItemIsActive(item.isActive !== false);
    } else {
      setEditingItem(null);
      setItemCategoryId(catId || (categories[0]?._id || ''));
      setItemQuestion('');
      setItemAnswer('');
      const targetCat = categories.find((c) => c._id === catId);
      setItemOrder(targetCat ? targetCat.questions.length : 0);
      setItemIsActive(true);
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCategoryId) {
      toast.error('Please select a category heading');
      return;
    }
    if (!itemQuestion.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (!itemAnswer.trim()) {
      toast.error('Answer text is required');
      return;
    }

    setSavingItem(true);
    try {
      if (editingItem) {
        await faqService.updateItem(editingItem._id, {
          categoryId: itemCategoryId,
          question: itemQuestion.trim(),
          answer: itemAnswer.trim(),
          order: itemOrder,
          isActive: itemIsActive,
        });
        toast.success('FAQ item updated successfully');
      } else {
        await faqService.createItem({
          categoryId: itemCategoryId,
          question: itemQuestion.trim(),
          answer: itemAnswer.trim(),
          order: itemOrder,
          isActive: itemIsActive,
        });
        toast.success('FAQ item created successfully');
      }
      setIsItemModalOpen(false);
      fetchFaqs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save FAQ item');
    } finally {
      setSavingItem(false);
    }
  };

  // --- Toggle Active Status ---
  const handleToggleCategoryActive = async (cat: AdminFaqCategory) => {
    try {
      await faqService.updateCategory(cat._id, { isActive: !cat.isActive });
      toast.success(`Category ${!cat.isActive ? 'activated' : 'deactivated'}`);
      fetchFaqs();
    } catch (error: any) {
      toast.error('Failed to update category status');
    }
  };

  const handleToggleItemActive = async (item: AdminFaqQuestion) => {
    try {
      await faqService.updateItem(item._id, { isActive: !item.isActive });
      toast.success(`Question ${!item.isActive ? 'activated' : 'deactivated'}`);
      fetchFaqs();
    } catch (error: any) {
      toast.error('Failed to update question status');
    }
  };

  // --- Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'category') {
        await faqService.deleteCategory(deleteTarget.id);
        toast.success('Category and all questions deleted successfully');
      } else {
        await faqService.deleteItem(deleteTarget.id);
        toast.success('FAQ item deleted successfully');
      }
      setDeleteTarget(null);
      fetchFaqs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Filter Categories and Questions based on Search Query
  const filteredCategories = categories.map((cat) => {
    const matchesCategory = cat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingQuestions = cat.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matchesCategory) {
      return cat;
    }
    return {
      ...cat,
      questions: matchingQuestions,
    };
  }).filter((cat) => cat.questions.length > 0 || cat.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-primary" />
            FAQ Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your dynamic FAQ Headings, Questions, and Answers for the public website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenCategoryModal()} variant="outline" className="gap-2">
            <FolderPlus className="w-4 h-4" />
            Add Heading
          </Button>
          <Button onClick={() => handleOpenItemModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Question & Answer
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search headings, questions, or answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* FAQs List Section */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl p-8 space-y-4">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No FAQs Found</h3>

          <p className="text-muted-foreground text-sm">
            {searchQuery ? 'No FAQ categories or questions match your search query.' : 'Click "Add Heading" or "Add Question & Answer" to create your first FAQ item.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => handleOpenCategoryModal()} className="gap-2">
              <FolderPlus className="w-4 h-4" />
              Create Heading
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat, idx) => (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={`border rounded-2xl overflow-hidden bg-card shadow-sm transition-all ${
                !cat.isActive ? 'opacity-70 bg-accent/20 border-dashed' : 'border-border'
              }`}
            >
              {/* Category Header */}
              <div className="p-5 bg-card border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {cat.order !== undefined ? cat.order + 1 : idx + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {cat.title}
                      {!cat.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                          Inactive Heading
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {cat.questions.length} Question{cat.questions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleCategoryActive(cat)}
                    title={cat.isActive ? 'Deactivate Heading' : 'Activate Heading'}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {cat.isActive ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenItemModal(cat._id)}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Q&A
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenCategoryModal(cat)}
                    title="Edit Heading"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDeleteTarget({
                        type: 'category',
                        id: cat._id,
                        name: `Heading "${cat.title}"`,
                      })
                    }
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete Heading"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              <div className="p-4 sm:p-6 space-y-3">
                {cat.questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No questions added under this heading yet.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {cat.questions.map((q, qIdx) => (
                      <AccordionItem
                        key={q._id}
                        value={q._id}
                        className={`border border-border/60 rounded-xl px-4 bg-card/60 hover:bg-accent/5 transition-colors ${
                          !q.isActive ? 'opacity-60 bg-muted/20 border-dashed' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between py-2">
                          <AccordionTrigger className="text-left font-medium text-base hover:no-underline py-2 pr-4 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">Q{qIdx + 1}.</span>
                              {q.question}
                              {!q.isActive && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  Hidden
                                </span>
                              )}
                            </span>
                          </AccordionTrigger>
                          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleItemActive(q)}
                              title={q.isActive ? 'Deactivate Question' : 'Activate Question'}
                              className="h-8 w-8 p-0"
                            >
                              {q.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenItemModal(cat._id, q)}
                              title="Edit Question & Answer"
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'item',
                                  id: q._id,
                                  name: `Question "${q.question}"`,
                                })
                              }
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pt-1 border-t border-border/40 mt-1">
                          <span className="font-semibold text-foreground">Answer: </span>
                          {q.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Category Heading Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit FAQ Heading' : 'Add New FAQ Heading'}</DialogTitle>
            <DialogDescription>
              Create or edit a top-level category heading to group questions under.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="categoryTitle">Heading Title</Label>
              <Input
                id="categoryTitle"
                placeholder="e.g., Booking & Services"
                value={categoryTitle}
                onChange={(e) => setCategoryTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryOrder">Display Order (Lower comes first)</Label>
              <Input
                id="categoryOrder"
                type="number"
                value={categoryOrder}
                onChange={(e) => setCategoryOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="categoryActive" className="cursor-pointer">
                Active / Visible on public FAQs page
              </Label>
              <Switch
                id="categoryActive"
                checked={categoryIsActive}
                onCheckedChange={setCategoryIsActive}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCategory}>
                {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? 'Update Heading' : 'Create Heading'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question & Answer Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit FAQ Question & Answer' : 'Add New Question & Answer'}</DialogTitle>
            <DialogDescription>
              Specify the question and answer text under a selected Heading.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category Heading</Label>
              <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                <SelectTrigger id="itemCategory">
                  <SelectValue placeholder="Select Category Heading" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemQuestion">Question</Label>
              <Input
                id="itemQuestion"
                placeholder="e.g., How do I make a booking?"
                value={itemQuestion}
                onChange={(e) => setItemQuestion(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemAnswer">Answer</Label>
              <Textarea
                id="itemAnswer"
                placeholder="Provide a detailed and helpful answer..."
                value={itemAnswer}
                onChange={(e) => setItemAnswer(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemOrder">Display Order within Heading</Label>
              <Input
                id="itemOrder"
                type="number"
                value={itemOrder}
                onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="itemActive" className="cursor-pointer">
                Active / Visible on public page
              </Label>
              <Switch
                id="itemActive"
                checked={itemIsActive}
                onCheckedChange={setItemIsActive}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingItem}>
                {savingItem && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingItem ? 'Update Q&A' : 'Create Q&A'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.name}?
              {deleteTarget?.type === 'category' && (
                <span className="block mt-2 font-medium text-destructive">
                  Warning: Deleting a category heading will also permanently delete all questions & answers contained inside it!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFaqsPage;
