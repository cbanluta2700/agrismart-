"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import AdminLayout from "@/components/layouts/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Save } from "lucide-react";
import { toast } from "react-hot-toast";

interface RelevanceSettings {
  titleWeight: number;
  descriptionWeight: number;
  categoryWeight: number;
  attributesWeight: number;
  sellerWeight: number;
  priceWeight: number;
  ratingWeight: number;
  enableSynonyms: boolean;
  enableTypoTolerance: boolean;
  enableStopwords: boolean;
  synonyms: {
    original: string;
    synonyms: string[];
  }[];
  stopwords: string[];
}

export default function SearchRelevancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<RelevanceSettings>({
    titleWeight: 1.5,
    descriptionWeight: 1.0,
    categoryWeight: 1.2,
    attributesWeight: 1.0,
    sellerWeight: 0.8,
    priceWeight: 0.6,
    ratingWeight: 0.7,
    enableSynonyms: true,
    enableTypoTolerance: true,
    enableStopwords: true,
    synonyms: [
      { original: "organic", synonyms: ["natural", "bio", "chemical-free"] },
      { original: "fertilizer", synonyms: ["plant food", "soil enhancer", "nutrient"] },
    ],
    stopwords: ["the", "and", "of", "in", "for"],
  });
  
  const [newSynonym, setNewSynonym] = useState({ original: "", synonyms: "" });
  const [newStopword, setNewStopword] = useState("");
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchSettings();
    }
  }, [status, router]);
  
  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real application, you would fetch this from the API
      // For now, we'll just use the default settings after a delay to simulate an API call
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error: any) {
      console.error("Failed to fetch search relevance settings:", error);
      setError(error.response?.data?.error || "Failed to fetch search relevance settings");
      setIsLoading(false);
    }
  };
  
  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // In a real application, you would send this to the API
      // For now, we'll just simulate an API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save settings to the database via API
      // await axios.post("/api/marketplace/search/relevance", settings);
      
      toast.success("Search relevance settings saved successfully");
    } catch (error: any) {
      console.error("Failed to save search relevance settings:", error);
      setError(error.response?.data?.error || "Failed to save search relevance settings");
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  const addSynonym = () => {
    if (!newSynonym.original || !newSynonym.synonyms) return;
    
    setSettings(prev => ({
      ...prev,
      synonyms: [
        ...prev.synonyms,
        {
          original: newSynonym.original,
          synonyms: newSynonym.synonyms.split(",").map(s => s.trim()),
        },
      ],
    }));
    
    setNewSynonym({ original: "", synonyms: "" });
  };
  
  const removeSynonym = (index: number) => {
    setSettings(prev => ({
      ...prev,
      synonyms: prev.synonyms.filter((_, i) => i !== index),
    }));
  };
  
  const addStopword = () => {
    if (!newStopword) return;
    
    setSettings(prev => ({
      ...prev,
      stopwords: [...prev.stopwords, newStopword],
    }));
    
    setNewStopword("");
  };
  
  const removeStopword = (word: string) => {
    setSettings(prev => ({
      ...prev,
      stopwords: prev.stopwords.filter(w => w !== word),
    }));
  };
  
  if (status === "loading" || isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-md bg-red-50 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Search Relevance Tuning</h1>
          
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="flex items-center"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Field Weights */}
          <Card>
            <CardHeader>
              <CardTitle>Field Weights</CardTitle>
              <CardDescription>
                Adjust the importance of each field in search results ranking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="titleWeight">Title Weight</Label>
                    <span className="text-sm">{settings.titleWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="titleWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.titleWeight]}
                    onValueChange={(values) => setSettings({ ...settings, titleWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="descriptionWeight">Description Weight</Label>
                    <span className="text-sm">{settings.descriptionWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="descriptionWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.descriptionWeight]}
                    onValueChange={(values) => setSettings({ ...settings, descriptionWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="categoryWeight">Category Weight</Label>
                    <span className="text-sm">{settings.categoryWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="categoryWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.categoryWeight]}
                    onValueChange={(values) => setSettings({ ...settings, categoryWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="attributesWeight">Attributes Weight</Label>
                    <span className="text-sm">{settings.attributesWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="attributesWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.attributesWeight]}
                    onValueChange={(values) => setSettings({ ...settings, attributesWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="sellerWeight">Seller Weight</Label>
                    <span className="text-sm">{settings.sellerWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="sellerWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.sellerWeight]}
                    onValueChange={(values) => setSettings({ ...settings, sellerWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="priceWeight">Price Weight</Label>
                    <span className="text-sm">{settings.priceWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="priceWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.priceWeight]}
                    onValueChange={(values) => setSettings({ ...settings, priceWeight: values[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="ratingWeight">Rating Weight</Label>
                    <span className="text-sm">{settings.ratingWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="ratingWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.ratingWeight]}
                    onValueChange={(values) => setSettings({ ...settings, ratingWeight: values[0] })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Search Features */}
          <Card>
            <CardHeader>
              <CardTitle>Search Features</CardTitle>
              <CardDescription>
                Enable or disable advanced search features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="enableSynonyms" className="flex flex-col space-y-1">
                  <span>Synonyms Matching</span>
                  <span className="font-normal text-xs text-gray-500">
                    Match "organic" to "natural", "bio", etc.
                  </span>
                </Label>
                <Switch
                  id="enableSynonyms"
                  checked={settings.enableSynonyms}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableSynonyms: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="enableTypoTolerance" className="flex flex-col space-y-1">
                  <span>Typo Tolerance</span>
                  <span className="font-normal text-xs text-gray-500">
                    Match "fertilizer" to "fertiliser" or "fertlizer"
                  </span>
                </Label>
                <Switch
                  id="enableTypoTolerance"
                  checked={settings.enableTypoTolerance}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableTypoTolerance: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="enableStopwords" className="flex flex-col space-y-1">
                  <span>Stop Words Filtering</span>
                  <span className="font-normal text-xs text-gray-500">
                    Ignore common words like "the", "and", "of"
                  </span>
                </Label>
                <Switch
                  id="enableStopwords"
                  checked={settings.enableStopwords}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableStopwords: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Synonyms Dictionary */}
        <Card>
          <CardHeader>
            <CardTitle>Synonyms Dictionary</CardTitle>
            <CardDescription>
              Define word equivalents to improve search results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="synonymOriginal">Original Term</Label>
                      <Input
                        id="synonymOriginal"
                        placeholder="e.g., organic"
                        value={newSynonym.original}
                        onChange={(e) => setNewSynonym({ ...newSynonym, original: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="synonymValues">Synonyms (comma separated)</Label>
                      <Input
                        id="synonymValues"
                        placeholder="e.g., natural, bio, eco-friendly"
                        value={newSynonym.synonyms}
                        onChange={(e) => setNewSynonym({ ...newSynonym, synonyms: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={addSynonym} className="w-full" disabled={!newSynonym.original || !newSynonym.synonyms}>
                    Add Synonym
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-12 font-medium bg-gray-50 p-2 border-b">
                  <div className="col-span-3">Original Term</div>
                  <div className="col-span-8">Synonyms</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y">
                  {settings.synonyms.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No synonyms defined yet. Add your first synonym above.
                    </div>
                  ) : (
                    settings.synonyms.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 p-2">
                        <div className="col-span-3">{item.original}</div>
                        <div className="col-span-8">{item.synonyms.join(", ")}</div>
                        <div className="col-span-1 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSynonym(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Stopwords List */}
        <Card>
          <CardHeader>
            <CardTitle>Stop Words</CardTitle>
            <CardDescription>
              Common words to ignore in search queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Input
                    placeholder="Enter a stop word to add"
                    value={newStopword}
                    onChange={(e) => setNewStopword(e.target.value)}
                  />
                </div>
                <div>
                  <Button onClick={addStopword} className="w-full" disabled={!newStopword}>
                    Add Stop Word
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {settings.stopwords.map((word) => (
                  <div
                    key={word}
                    className="flex items-center bg-gray-100 rounded-full px-3 py-1"
                  >
                    <span className="text-sm">{word}</span>
                    <button
                      onClick={() => removeStopword(word)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {settings.stopwords.length === 0 && (
                  <div className="text-gray-500">
                    No stop words defined yet. Add your first stop word above.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
