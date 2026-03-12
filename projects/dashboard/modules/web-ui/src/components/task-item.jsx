import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const taskPropTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['pending', 'in_progress', 'done', 'ready']).isRequired,
  priority: PropTypes.number.isRequired,
  owner: PropTypes.string,
  description: PropTypes.string,
};

const getStatusVariant = (status) => {
  switch (status) {
    case 'done':
      return 'success';
    case 'in_progress':
      return 'secondary';
    case 'pending':
      return 'destructive';
    case 'ready':
    default:
      return 'default';
  }
};

const TaskItem = ({ id, name, status, priority, owner, description }) => {
  const ownerInitial = owner ? owner.charAt(0).toUpperCase() : '?';

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant={getStatusVariant(status)}>{status.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground pt-2">
          <div className="flex items-center">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback>{ownerInitial}</AvatarFallback>
            </Avatar>
            <span>{owner || 'Unassigned'}</span>
          </div>
          <span className="mx-2">|</span>
          <span>Priority: {priority}</span>
        </div>
      </CardHeader>
      {description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      )}
    </Card>
  );
};

TaskItem.propTypes = taskPropTypes;

export default TaskItem;
