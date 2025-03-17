
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useStockPredictions } from "@/hooks/use-stock-predictions";

export function WatchlistManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    watchlist, 
    searchResults, 
    isSearching, 
    searchStocks, 
    addToWatchlist, 
    removeFromWatchlist 
  } = useWatchlist();
  const { updateWatchlist } = useStockPredictions();

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchStocks(query);
  };

  // Handle adding stock to watchlist and update the main watchlist
  const handleAddStock = (symbol: string, name: string) => {
    addToWatchlist(symbol, name);
    setSearchQuery('');
    
    // Update the main watchlist in the stock predictions hook
    const symbols = watchlist.map(item => item.symbol);
    if (!symbols.includes(symbol)) {
      updateWatchlist([...symbols, symbol]);
    }
  };

  // Handle removing stock from watchlist
  const handleRemoveStock = (id: string, symbol: string) => {
    removeFromWatchlist(id, symbol);
    
    // Update the main watchlist in the stock predictions hook
    const symbols = watchlist
      .filter(item => item.id !== id)
      .map(item => item.symbol);
    
    updateWatchlist(symbols);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for stocks by symbol or name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {searchQuery && searchResults.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((result) => (
                    <TableRow key={result.symbol}>
                      <TableCell className="font-medium">{result.symbol}</TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.type}</TableCell>
                      <TableCell>{result.region}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddStock(result.symbol, result.name)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {isSearching && (
            <div className="flex justify-center py-4">
              <p className="text-muted-foreground">Searching...</p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Your Watchlist</h3>
            {watchlist.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchlist.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.symbol}</TableCell>
                        <TableCell>{item.company_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            {new Date(item.added_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRemoveStock(item.id, item.symbol)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">Your watchlist is empty. Search and add stocks above.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
