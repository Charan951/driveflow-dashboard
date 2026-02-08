import Role from '../models/Role.js';

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private/Admin
export const createRole = async (req, res) => {
  const { name, permissions, description } = req.body;
  try {
    const roleExists = await Role.findOne({ name });
    if (roleExists) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = await Role.create({
      name,
      permissions,
      description,
    });

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private/Admin
export const updateRole = async (req, res) => {
  const { name, permissions, description } = req.body;
  try {
    const role = await Role.findById(req.params.id);

    if (role) {
      role.name = name || role.name;
      role.permissions = permissions || role.permissions;
      role.description = description || role.description;

      const updatedRole = await role.save();
      res.json(updatedRole);
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (role) {
      await role.deleteOne();
      res.json({ message: 'Role removed' });
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
