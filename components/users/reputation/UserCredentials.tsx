import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileCheck, FileQuestion, XCircle } from 'lucide-react';

export interface Credential {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string | null;
  verified: boolean;
  verifiedAt?: string | null;
  documentUrl?: string | null;
}

interface UserCredentialsProps {
  credentials: Credential[];
  showAddButton?: boolean;
  onAddCredential?: () => void;
}

export default function UserCredentials({ 
  credentials, 
  showAddButton = false,
  onAddCredential
}: UserCredentialsProps) {
  if (credentials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credentials</CardTitle>
          <CardDescription>
            Verified professional credentials and certifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No credentials have been added yet
            </p>
            
            {showAddButton && (
              <button
                onClick={onAddCredential}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add credential
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Credentials</CardTitle>
          <CardDescription>
            Verified professional credentials and certifications
          </CardDescription>
        </div>
        
        {showAddButton && (
          <button
            onClick={onAddCredential}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Add
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {credentials.map((credential) => (
            <div key={credential.id} className="flex justify-between border-b pb-3 last:border-b-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{credential.name}</h3>
                  <VerificationBadge verified={credential.verified} />
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Issued by {credential.issuer} • {formatDate(credential.issuedAt)}
                </p>
                
                {credential.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {formatDate(credential.expiresAt)}
                  </p>
                )}
              </div>
              
              {credential.documentUrl && (
                <a 
                  href={credential.documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline self-start"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for verification badge
function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1 text-xs py-0 h-5">
              <FileCheck className="h-3 w-3" />
              Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This credential has been verified by the AgriSmart team</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1 text-xs py-0 h-5">
            <FileQuestion className="h-3 w-3" />
            Pending
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This credential is pending verification</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
