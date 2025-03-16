
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, AlertCircle, Check } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useToast } from "@/components/ui/use-toast";

const historyData = [
  { month: "Jan", score: 680 },
  { month: "Feb", score: 685 },
  { month: "Mar", score: 690 },
  { month: "Apr", score: 695 },
  { month: "May", score: 705 },
  { month: "Jun", score: 715 },
];

const improvementTips = [
  {
    title: "Pay bills on time",
    description: "Payment history accounts for 35% of your credit score. Set up automatic payments to avoid missing due dates.",
    impact: "High",
  },
  {
    title: "Reduce credit utilization",
    description: "Try to keep your credit card balances below 30% of your available credit limit.",
    impact: "High",
  },
  {
    title: "Limit new credit applications",
    description: "Multiple credit inquiries in a short period can lower your score. Apply for new credit sparingly.",
    impact: "Medium",
  },
  {
    title: "Increase credit limits",
    description: "If you have good standing with your credit card companies, request higher limits to lower your utilization ratio.",
    impact: "Medium",
  },
  {
    title: "Keep old accounts open",
    description: "Length of credit history matters. Keep older accounts open even if you don't use them regularly.",
    impact: "Low",
  },
];

const DashboardCredit = () => {
  const { toast } = useToast();
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    income: "",
    debt: "",
    paymentHistory: "good",
    creditUtilization: [30],
    creditHistoryLength: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSliderChange = (name: string, value: number[]) => {
    setFormData({ ...formData, [name]: value });
  };

  const handlePredict = () => {
    // Simple algorithm to predict credit score
    // In a real app, this would use machine learning or a more complex model
    let baseScore = 650;
    
    // Adjust for income
    const income = parseFloat(formData.income);
    if (income > 100000) baseScore += 30;
    else if (income > 60000) baseScore += 20;
    else if (income > 30000) baseScore += 10;
    
    // Adjust for debt
    const debt = parseFloat(formData.debt);
    if (debt < 10000) baseScore += 30;
    else if (debt < 30000) baseScore += 15;
    else if (debt < 50000) baseScore += 5;
    else baseScore -= 20;
    
    // Adjust for payment history
    if (formData.paymentHistory === "excellent") baseScore += 50;
    else if (formData.paymentHistory === "good") baseScore += 30;
    else if (formData.paymentHistory === "fair") baseScore += 10;
    else baseScore -= 30;
    
    // Adjust for credit utilization
    const utilization = formData.creditUtilization[0];
    if (utilization < 10) baseScore += 40;
    else if (utilization < 30) baseScore += 20;
    else if (utilization < 50) baseScore += 0;
    else if (utilization < 70) baseScore -= 20;
    else baseScore -= 40;
    
    // Adjust for credit history length
    const historyYears = parseInt(formData.creditHistoryLength || "0");
    if (historyYears > 7) baseScore += 40;
    else if (historyYears > 3) baseScore += 20;
    else if (historyYears > 1) baseScore += 10;
    
    // Clamp the score between 300 and 850
    const finalScore = Math.min(850, Math.max(300, baseScore));
    setCreditScore(finalScore);
    
    toast({
      title: "Credit Score Prediction",
      description: `Based on the information provided, your estimated credit score is ${finalScore}.`,
    });
  };
  
  const getScoreCategory = (score: number) => {
    if (score >= 800) return { category: "Excellent", color: "text-green-500" };
    if (score >= 740) return { category: "Very Good", color: "text-green-500" };
    if (score >= 670) return { category: "Good", color: "text-yellow-500" };
    if (score >= 580) return { category: "Fair", color: "text-orange-500" };
    return { category: "Poor", color: "text-red-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credit Score Prediction</h2>
          <p className="text-muted-foreground">
            Predict your credit score and get tips for improvement
          </p>
        </div>
      </div>

      <Tabs defaultValue="predict" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predict">Predict Score</TabsTrigger>
          <TabsTrigger value="history">Score History</TabsTrigger>
          <TabsTrigger value="improve">Improvement Tips</TabsTrigger>
        </TabsList>
        
        <TabsContent value="predict" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Score Calculator</CardTitle>
              <CardDescription>
                Enter your financial information to predict your credit score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="income">Annual Income ($)</Label>
                  <Input
                    id="income"
                    name="income"
                    type="number"
                    placeholder="Enter your annual income"
                    value={formData.income}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt">Total Debt ($)</Label>
                  <Input
                    id="debt"
                    name="debt"
                    type="number"
                    placeholder="Enter your total debt"
                    value={formData.debt}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-history">Payment History</Label>
                <Select 
                  value={formData.paymentHistory} 
                  onValueChange={(value) => handleSelectChange('paymentHistory', value)}
                >
                  <SelectTrigger id="payment-history">
                    <SelectValue placeholder="Select your payment history" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (No missed payments)</SelectItem>
                    <SelectItem value="good">Good (1-2 missed payments)</SelectItem>
                    <SelectItem value="fair">Fair (3-5 missed payments)</SelectItem>
                    <SelectItem value="poor">Poor (6+ missed payments)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Credit Utilization ({formData.creditUtilization[0]}%)</Label>
                <Slider
                  value={formData.creditUtilization}
                  onValueChange={(value) => handleSliderChange('creditUtilization', value)}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  The percentage of your available credit that you're currently using
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="credit-history">Credit History Length (years)</Label>
                <Input
                  id="credit-history"
                  name="creditHistoryLength"
                  type="number"
                  placeholder="Enter years of credit history"
                  value={formData.creditHistoryLength}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePredict} className="w-full">Predict Credit Score</Button>
            </CardFooter>
          </Card>
          
          {creditScore && (
            <Card>
              <CardHeader>
                <CardTitle>Your Predicted Credit Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="text-5xl font-bold mb-2">{creditScore}</div>
                <div className={`text-xl font-medium ${getScoreCategory(creditScore).color}`}>
                  {getScoreCategory(creditScore).category}
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full mt-4">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((creditScore - 300) / 550) * 100}%`,
                      background: "linear-gradient(to right, #ef4444, #f59e0b, #10b981)",
                    }}
                  />
                </div>
                <div className="w-full flex justify-between text-xs mt-1">
                  <span>300</span>
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Excellent</span>
                  <span>850</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Score History</CardTitle>
              <CardDescription>
                Track your credit score changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[650, 750]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center text-green-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+35 points in 6 months</span>
              </div>
              <Button variant="outline" size="sm">View Detailed Report</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="improve" className="space-y-4">
          <div className="grid gap-4 grid-cols-1">
            {improvementTips.map((tip, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <Check className={`h-5 w-5 mt-0.5 ${
                      tip.impact === "High" ? "text-green-500" :
                      tip.impact === "Medium" ? "text-yellow-500" :
                      "text-blue-500"
                    }`} />
                    <div>
                      <CardTitle className="text-lg font-medium">{tip.title}</CardTitle>
                      <CardDescription>
                        Impact: <span className={
                          tip.impact === "High" ? "text-green-500" :
                          tip.impact === "Medium" ? "text-yellow-500" :
                          "text-blue-500"
                        }>{tip.impact}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {tip.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardCredit;
