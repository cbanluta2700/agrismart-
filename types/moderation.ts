export interface GroupSettings {
  id: string;
  groupId: string;
  allowJoinRequests: boolean;
  requireApproval: boolean;
  allowMemberPosts: boolean;
  isPrivate: boolean;
  rules: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationLog {
  id: string;
  groupId: string;
  moderatorId: string;
  action: ModerationAction;
  itemType: ModerationItemType;
  itemId: string;
  reason: string | null;
  createdAt: Date;
  moderator?: {
    name: string;
    avatar: string | null;
  };
}

export enum ModerationAction {
  HIDE = 'HIDE',
  UNHIDE = 'UNHIDE',
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK',
  DELETE = 'DELETE',
  ROLE_CHANGE = 'ROLE_CHANGE'
}

export enum ModerationItemType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  MEMBER = 'MEMBER'
}
