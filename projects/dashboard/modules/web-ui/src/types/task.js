// projects/dashboard/modules/web-ui/src/components/task-item.jsx

export const taskPropTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['pending', 'in_progress', 'done', 'ready']).isRequired,
  priority: PropTypes.number.isRequired,
  owner: PropTypes.string,
  description: PropTypes.string,
};
