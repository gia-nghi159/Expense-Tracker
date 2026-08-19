import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CreditCard,
  DollarSign,
  Layers,
  Sparkles,
  TrendingDown,
  Users,
  Trash2,
  Clock,
  Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import Navbar from './Navbar';
import NetworkGraph from './NetworkGraph';
import AddExpenseModal from './Modals/AddExpenseModal';
import SimplifyModal from './Modals/SimplifyModal';
import CreateTripModal from './Modals/CreateTripModal';
import ManageMembersModal from './Modals/ManageMembersModal';

const GraphDashboard = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [networkData, setNetworkData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [simplifyData, setSimplifyData] = useState(null);
  const [isNeo4jConnected, setIsNeo4jConnected] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);

  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSimplifyOpen, setIsSimplifyOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HEALTH);
      setIsNeo4jConnected(!!res.data?.neo4j_connected);
    } catch {
      setIsNeo4jConnected(false);
    }
  }, []);

  // Selected Group ID
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    return tripId || localStorage.getItem('fingraph_active_trip') || null;
  });

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    if (groupId) {
      localStorage.setItem('fingraph_active_trip', groupId);
      navigate(`/trip/${groupId}`, { replace: true });
    }
  };

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.GROUPS.LIST);
      setGroups(res.data);
      if (res.data.length > 0) {
        const savedId = tripId || localStorage.getItem('fingraph_active_trip');
        const exists = res.data.some((g) => g.id === savedId);
        if (savedId && exists) {
          setSelectedGroupId(savedId);
        } else {
          setSelectedGroupId(res.data[0].id);
          localStorage.setItem('fingraph_active_trip', res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, [tripId]);

  // Fetch network data
  const fetchNetwork = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      const [netRes, expRes, simRes] = await Promise.all([
        axiosInstance.get(API_PATHS.GRAPH.NETWORK(groupId)),
        axiosInstance.get(API_PATHS.EXPENSES.LIST_GROUP(groupId)),
        axiosInstance.post(API_PATHS.GRAPH.SIMPLIFY(groupId)).catch(() => ({ data: null })),
      ]);
      setNetworkData(netRes.data);
      setExpenses(expRes.data);
      if (simRes.data) {
        setSimplifyData(simRes.data);
      }
    } catch (err) {
      console.error('Failed to load network graph:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    fetchGroups();
  }, [checkHealth, fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchNetwork(selectedGroupId);
    }
  }, [selectedGroupId, fetchNetwork]);

  // Seed demo
  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      const res = await axiosInstance.post(API_PATHS.SEED);
      toast.success('🌱 Dummy data seeded!');
      await fetchGroups();
      if (res.data.group_id) {
        handleSelectGroup(res.data.group_id);
        await fetchNetwork(res.data.group_id);
      }
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      toast.error('Failed to seed demo data.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRunSimplification = async () => {
    if (!selectedGroupId) return;
    try {
      setIsSimplifying(true);
      const res = await axiosInstance.post(API_PATHS.GRAPH.SIMPLIFY(selectedGroupId));
      setSimplifyData(res.data);
      setIsSimplifyOpen(true);
    } catch {
      toast.error('Failed to simplify debts.');
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense? This will recalculate the entire debt web!')) return;
    try {
      await axiosInstance.delete(API_PATHS.EXPENSES.DELETE(expenseId));
      toast.success('Expense deleted. Graph healed! ✨');
      fetchNetwork(selectedGroupId);
    } catch {
      toast.error('Failed to delete expense.');
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectGroup}
          onSeedDemo={handleSeedDemo}
          onOpenCreateTrip={() => setIsCreateTripOpen(true)}
          onOpenManageMembers={() => setIsManageMembersOpen(true)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenSimplify={handleRunSimplification}
          isNeo4jConnected={isNeo4jConnected}
          isSeeding={isSeeding}
          isSimplifying={isSimplifying}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spending */}
            <div className="bg-white/80 border-2 border-emerald-300/80 rounded-3xl p-5 shadow-lg backdrop-blur-xl flex items-center gap-4 hover:shadow-xl hover:border-emerald-400 transition">
              <div className="w-13 h-13 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm text-2xl font-bold">
                💰
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Total Spending</p>
                <p className="text-2xl font-black text-slate-900">
                  ${networkData?.total_group_spending?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            {/* Trip Budget */}
            <div className="bg-white/80 border-2 border-amber-300/80 rounded-3xl p-5 shadow-lg backdrop-blur-xl flex items-center gap-4 hover:shadow-xl hover:border-amber-400 transition">
              <div className="w-13 h-13 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-sm text-2xl font-bold">
                📊
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800">Trip Budget</p>
                  {networkData?.budget && (
                    <span className="text-xs font-bold text-slate-700">
                      ${networkData.total_group_spending?.toFixed(2)} / ${networkData.budget.toFixed(2)}
                    </span>
                  )}
                </div>
                {networkData?.budget ? (
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        (networkData.total_group_spending / networkData.budget) > 0.9 ? 'bg-red-400' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min((networkData.total_group_spending / networkData.budget) * 100, 100)}%` }}
                    ></div>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-500 mt-1">No limit set</p>
                )}
              </div>
            </div>

            {/* Trip Crew */}
            <div className="bg-white/80 border-2 border-emerald-300/80 rounded-3xl p-5 shadow-lg backdrop-blur-xl flex items-center gap-4 hover:shadow-xl hover:border-emerald-400 transition">
              <div className="w-13 h-13 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm text-2xl font-bold">
                👥
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Trip Friends</p>
                <p className="text-2xl font-black text-slate-900">
                  {networkData?.nodes?.length || 0} People
                </p>
              </div>
            </div>
          </div>

          {/* Main Workspace: Graph Network + Side Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: React Flow Interactive Graph */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <span>Live Debt Network Topology</span>
                  </h2>
                  <p className="text-xs font-medium text-slate-600">
                    Drag nodes freely • Switch between raw web and clean net flow
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="h-[590px] rounded-3xl border border-white/80 bg-white/60 backdrop-blur-xl flex items-center justify-center text-slate-700 font-bold text-sm shadow-xl">
                  Loading graph topology... 💰
                </div>
              ) : (
                <NetworkGraph
                  nodes={networkData?.nodes || []}
                  edges={networkData?.edges || []}
                  simplifiedSettlements={simplifyData?.settlements || []}
                />
              )}
            </div>

            {/* Right Col: Member Net Balances & Active Transfers */}
            <div className="space-y-6">
              {/* Member Net Balance Roster */}
              <div className="bg-white/80 border-2 border-emerald-200/80 rounded-3xl p-5 shadow-lg backdrop-blur-xl space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Friend Balances
                </h3>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {networkData?.nodes?.map((node) => {
                    const isPos = node.net_balance > 0.01;
                    const isNeg = node.net_balance < -0.01;

                    return (
                      <div
                        key={node.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm hover:border-emerald-300 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={node.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${node.name}`}
                            alt={node.name}
                            className="w-8 h-8 rounded-xl bg-slate-100 object-cover border border-slate-200"
                          />
                          <span className="text-xs font-bold text-slate-900 truncate">{node.name}</span>
                        </div>
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            isPos
                              ? 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                              : isNeg
                                ? 'text-rose-800 bg-rose-100 border border-rose-300'
                                : 'text-slate-600 bg-slate-100'
                          }`}
                        >
                          {isPos && '+'}
                          ${node.net_balance.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Spending List */}
              <div className="bg-white/80 border-2 border-rose-200/80 rounded-3xl p-5 shadow-lg backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-600" />
                    Spending by Category
                  </h3>
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {(!networkData?.category_breakdown || Object.keys(networkData.category_breakdown).length === 0) ? (
                    <p className="text-xs font-bold text-slate-500 py-4 text-center">No expenses logged yet 👥</p>
                  ) : (
                    Object.entries(networkData.category_breakdown).sort((a,b) => b[1] - a[1]).map(([cat, amount], idx) => {
                      const percentage = networkData.total_group_spending > 0 ? (amount / networkData.total_group_spending) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">{cat}</span>
                            <span className="font-black text-slate-900">${amount.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Expense History */}
          {expenses.length > 0 && (
            <div className="bg-white/80 border-2 border-slate-200/80 rounded-3xl p-6 shadow-lg backdrop-blur-xl">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-slate-600" />
                Trip History & Recent Expenses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenses.map((exp) => {
                  const payer = selectedGroup?.members?.find((m) => m.id === exp.paid_by_user_id)?.name || 'Someone';
                  return (
                    <div key={exp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{exp.description}</p>
                          <p className="text-xs font-semibold text-slate-500">{exp.category}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setExpenseToEdit(exp);
                              setIsAddExpenseOpen(true);
                            }}
                            className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-50 transition"
                            title="Edit Expense"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-slate-400 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <div className="text-xs font-medium text-slate-600">
                          Paid by <span className="font-bold text-slate-900">{payer}</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600">${exp.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onTripCreated={async (newGroupId) => {
          await fetchGroups();
          handleSelectGroup(newGroupId);
          await fetchNetwork(newGroupId);
        }}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(null);
        }}
        group={selectedGroup}
        initialExpense={expenseToEdit}
        onExpenseAdded={() => fetchNetwork(selectedGroupId)}
      />

      <SimplifyModal
        isOpen={isSimplifyOpen}
        onClose={() => setIsSimplifyOpen(false)}
        simplifyData={simplifyData}
        groupId={selectedGroupId}
        onSettled={() => fetchNetwork(selectedGroupId)}
      />

      <ManageMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        group={selectedGroup}
        networkData={networkData}
        onMembersUpdated={async (isTripDeleted) => {
          if (isTripDeleted) {
            setSelectedGroupId(null);
            setNetworkData(null);
            setExpenses([]);
            await fetchGroups();
          } else {
            await fetchGroups();
            await fetchNetwork(selectedGroupId);
          }
        }}
      />
    </div>
  );
};

export default GraphDashboard;
