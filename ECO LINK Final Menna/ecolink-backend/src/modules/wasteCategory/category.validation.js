import mongoose from 'mongoose';

const validateAddCategory = (body) => {
  const { name, description } = body || {};
  if (!name || !String(name).trim()) return 'Name is required';
  if (!description || !String(description).trim()) return 'Description is required';
  return null;
};

/** Use second arg `req` so DELETE with empty body still reads `req.params.id`. */
const validateCategoryIdParam = (_data, req) => {
  const id = req?.params?.id;
  if (!id || !String(id).trim()) return 'Category id is required';
  if (!mongoose.Types.ObjectId.isValid(String(id).trim())) return 'Invalid category id';
  return null;
};


const validateUpdateCategory = (body) => {
  const { name, description } = body || {};
  const hasName = name !== undefined && name !== null;
  const hasDescription = description !== undefined && description !== null;

  if (!hasName && !hasDescription) {
    return 'At least one of name or description is required';
  }
  if (hasName && !String(name).trim()) return 'Name cannot be empty';
  if (hasDescription && !String(description).trim()) return 'Description cannot be empty';
  return null;
};

export { validateAddCategory, validateCategoryIdParam, validateUpdateCategory };
